import React, { useEffect, useRef } from "react";
import { Conversation } from "./ConversationsPage";
import { Search, Plus, MessageSquare, X } from "lucide-react";
import { SkeletonConversationList } from "../shared/Skeleton";
import CustomDropdown, { DropdownOption } from "../shared/CustomDropdown";

const formatLastMessageTime = (timeStr: string) => {
  if (!timeStr) return "";
  if (timeStr === "Just now") return "Just now";
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = todayMidnight.getTime() - targetMidnight.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (targetMidnight.getTime() === todayMidnight.getTime()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (targetMidnight.getTime() === yesterdayMidnight.getTime()) {
    return "Yesterday";
  } else if (diffDays < 7 && diffDays > 0) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
};

type TabType = "all" | "unread" | "ai" | "orders";
type TimeFilterType = "today" | "yesterday" | "week" | "month" | null;

interface ConversationListProps {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  searchConversations: string;
  selectedConversationId: number | null;
  totalUnread: number;
  displayedConversations: number;
  activeTab: TabType;
  stageFilter: string | null;
  timeFilter: TimeFilterType;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation?: () => void;
  onTabChange: (tab: TabType) => void;
  onStageFilterChange: (stage: string | null) => void;
  onTimeFilterChange: (filter: TimeFilterType) => void;
  loading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  filteredConversations,
  searchConversations,
  selectedConversationId,
  totalUnread,
  displayedConversations,
  activeTab,
  stageFilter,
  timeFilter,
  onSearchChange,
  onSelectConversation,
  onNewConversation,
  onTabChange,
  onStageFilterChange,
  onTimeFilterChange,
  loading = false,
}) => {
  const selectedConversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConversationRef.current) {
      selectedConversationRef.current.scrollIntoView({
        behavior: "auto",
        block: "nearest",
      });
    }
  }, [selectedConversationId]);

  const getCurrentStageInfo = (conversation: Conversation) => {
    const { conversionStage, interestStage, leadStage } = conversation;
    if (conversionStage) {
      return {
        stage: conversionStage,
        badgeClass: "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]",
      };
    } else if (interestStage) {
      return {
        stage: interestStage,
        badgeClass: "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]",
      };
    } else if (leadStage) {
      return {
        stage: leadStage,
        badgeClass: "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]",
      };
    } else {
      return { stage: null, badgeClass: "" };
    }
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: conversations.length },
    {
      key: "unread",
      label: "Unread",
      count: conversations.filter((c) => c.unreadCount > 0).length,
    },
    {
      key: "ai",
      label: "AI",
      count: conversations.filter((c) => c.aiEnabled).length,
    },
    {
      key: "orders",
      label: "Orders",
      count: conversations.filter((c) => c.conversionStage === "Order Confirmed").length,
    },
  ];

  return (
    <div
      className={`h-full flex flex-col bg-white border-r border-[#EAEAEA] shadow-[1px_0_4px_rgba(20,40,24,0.02)] ${
        selectedConversationId !== null ? "hidden md:flex" : "flex"
      } w-full md:w-[320px] lg:w-[360px] xl:w-[380px] shrink-0 font-sans select-none`}
    >
      {/* 1. Segmented Capsule Filter Tabs */}
      <div className="p-1 mx-3.5 mt-3.5 mb-2 bg-[#F4F7F4] rounded-full border border-[#EAEAEA] flex items-center gap-1 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex-1 py-1.5 px-2.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                isActive
                  ? "bg-[#16281D] text-white shadow-xs"
                  : "bg-transparent text-[#71717A] hover:text-[#16281D]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-[#203628] text-[#9FE870]"
                      : "bg-[#EAEAEA] text-[#71717A]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Search & Filter Controls Bar */}
      <div className="px-3.5 pb-3 pt-1 border-b border-[#EAEAEA] flex flex-col gap-2 shrink-0">
        {/* Search Capsule Input */}
        <div className="relative flex items-center w-full">
          <Search
            size={14}
            className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
          />
          <input
            type="text"
            value={searchConversations}
            onChange={onSearchChange}
            placeholder="Search conversations..."
            className="w-full h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
          />
          {searchConversations && (
            <button
              type="button"
              onClick={() => onSearchChange({ target: { value: "" } } as any)}
              className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Stage & Time Filter Row */}
        <div className="flex items-center gap-2">
          {/* Stage Dropdown */}
          <CustomDropdown
            value={stageFilter ?? ""}
            onChange={(val) => onStageFilterChange(val === "" ? null : val)}
            options={[
              { value: "", label: "All Stages" },
              { value: "New Lead", label: "New Lead", group: "Lead Stage" },
              { value: "Contacted", label: "Contacted", group: "Lead Stage" },
              { value: "Not Responding", label: "Not Responding", group: "Lead Stage" },
              { value: "Follow-up Needed", label: "Follow-up Needed", group: "Lead Stage" },
              { value: "Interested", label: "Interested", group: "Interest Stage" },
              { value: "Quotation Sent", label: "Quotation Sent", group: "Interest Stage" },
              { value: "Asked for More Info", label: "Asked for More Info", group: "Interest Stage" },
              { value: "Payment Pending", label: "Payment Pending", group: "Conversion Stage" },
              { value: "Paid", label: "Paid", group: "Conversion Stage" },
              { value: "Order Confirmed", label: "Order Confirmed", group: "Conversion Stage" },
            ]}
            placeholder="All Stages"
            size="sm"
            className="flex-1 min-w-0"
            triggerClassName={
              stageFilter
                ? "!bg-[#F0FDF4] !border-[#BBF7D0] !text-[#15803D]"
                : ""
            }
          />

          {/* Timeframe Dropdown */}
          <CustomDropdown
            value={timeFilter ?? ""}
            onChange={(val) => onTimeFilterChange(val === "" ? null : (val as TimeFilterType))}
            options={[
              { value: "", label: "Any Time" },
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
              { value: "week", label: "This Week" },
              { value: "month", label: "This Month" },
            ]}
            placeholder="Any Time"
            size="sm"
            className="flex-1 min-w-0"
            triggerClassName={
              timeFilter
                ? "!bg-[#F0FDF4] !border-[#BBF7D0] !text-[#15803D]"
                : ""
            }
          />

          {onNewConversation && (
            <button
              type="button"
              onClick={onNewConversation}
              className="w-8 h-8 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-95 text-[#16281D] flex items-center justify-center transition-all cursor-pointer border-0 shadow-[0_2px_8px_rgba(159,232,112,0.35)] shrink-0"
              title="Start new customer conversation"
              aria-label="Start new customer conversation"
            >
              <Plus size={16} strokeWidth={2.6} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Scrollable Conversations Stream */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar contain-scroll">
        {loading ? (
          <SkeletonConversationList count={6} />
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-[#F4F7F4] flex items-center justify-center mx-auto mb-3 text-[#A1A1AA]">
                <MessageSquare size={20} />
              </div>
              <div className="text-sm font-bold text-[#16281D] mb-1">
                No conversations yet
              </div>
              <div className="text-xs text-[#71717A]">
                Customer inquiries will stream here automatically
              </div>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-xs font-bold text-[#16281D] mb-1">
              No matching conversations
            </div>
            <div className="text-[11px] text-[#71717A]">
              Try adjusting your search query or stage filters
            </div>
          </div>
        ) : (
          filteredConversations.map((conversation, index) => {
            const stageInfo = getCurrentStageInfo(conversation);
            const isSelected = selectedConversationId === conversation.id;

            return (
              <div
                key={`${conversation.id}-${index}`}
                ref={isSelected ? selectedConversationRef : null}
                onClick={() => onSelectConversation(conversation)}
                className={`p-3 rounded-2xl transition-colors duration-150 cursor-pointer flex items-start gap-3 border ${
                  isSelected
                    ? "bg-[#F0FDF4] border-[#BBF7D0] shadow-xs"
                    : "bg-transparent border-transparent hover:bg-[#F4F7F4]/80"
                }`}
              >
                {/* Customer Initials Avatar */}
                <div
                  className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 transition-colors duration-150 ${
                    isSelected
                      ? "bg-[#16281D] text-[#9FE870] border border-[#9FE870]/40 shadow-xs"
                      : "bg-[#16281D] text-[#9FE870] border border-black/5"
                  }`}
                >
                  {conversation.customerName ? conversation.customerName.charAt(0).toUpperCase() : "C"}
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  {/* Top line: Name, Stage badge & Unread counter */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs sm:text-[13px] font-bold text-[#16281D] truncate leading-tight">
                      {conversation.customerName}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {stageInfo.stage && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full truncate max-w-[80px] ${stageInfo.badgeClass}`}
                        >
                          {stageInfo.stage}
                        </span>
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#9FE870] text-[#16281D] text-[9px] font-extrabold flex items-center justify-center shadow-2xs font-mono">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle line: Message preview & Relative timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#71717A] truncate flex-1 leading-tight">
                      {conversation.lastMessage ? conversation.lastMessage.replace(/\*/g, "") : "No messages"}
                    </span>
                    <span className="text-[10px] text-[#A1A1AA] font-mono shrink-0">
                      {formatLastMessageTime(conversation.lastMessageTime)}
                    </span>
                  </div>

                  {/* Bottom line: Customer phone */}
                  <div className="text-[10px] text-[#A1A1AA] font-mono truncate mt-1">
                    {conversation.customerPhone}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
