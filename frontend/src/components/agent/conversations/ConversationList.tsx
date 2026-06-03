import React, { useEffect, useRef } from "react";
import { Conversation } from "./ConversationsPage";
import { Search, Plus, MessageSquare, ChevronDown } from "lucide-react";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

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
    return date.toLocaleDateString([], { weekday: "long" });
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
}

const STAGE_OPTIONS = [
  { label: "All Stages", value: null, group: null },
  { label: "New Lead", value: "New Lead", group: "Lead" },
  { label: "Contacted", value: "Contacted", group: "Lead" },
  { label: "Not Responding", value: "Not Responding", group: "Lead" },
  { label: "Follow-up Needed", value: "Follow-up Needed", group: "Lead" },
  { label: "Interested", value: "Interested", group: "Interest" },
  { label: "Quotation Sent", value: "Quotation Sent", group: "Interest" },
  { label: "Asked for More Info", value: "Asked for More Info", group: "Interest" },
  { label: "Payment Pending", value: "Payment Pending", group: "Conversion" },
  { label: "Paid", value: "Paid", group: "Conversion" },
  { label: "Order Confirmed", value: "Order Confirmed", group: "Conversion" },
];

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
}) => {
  const selectedConversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConversationRef.current) {
      selectedConversationRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedConversationId]);

  const getCurrentStageInfo = (conversation: Conversation) => {
    const { conversionStage, interestStage, leadStage } = conversation;
    if (conversionStage) {
      return {
        stage: conversionStage,
        style: { background: "rgba(34,197,94,0.1)", color: "#059669" },
      };
    } else if (interestStage) {
      return {
        stage: interestStage,
        style: { background: "rgba(217,119,6,0.1)", color: "#d97706" },
      };
    } else if (leadStage) {
      return {
        stage: leadStage,
        style: { background: "rgba(8,145,178,0.1)", color: "#0891b2" },
      };
    } else {
      return { stage: null, style: {} };
    }
  };

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #ebebeb",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxShadow: "1px 0 4px rgba(0,0,0,0.03)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid #f4f4f5",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              ...SYNE,
              fontSize: 20,
              fontWeight: 700,
              color: "#0c1a0e",
              lineHeight: 1.2,
            }}
          >
            Messages
          </span>
          <span
            style={{
              ...DM,
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 9999,
              background: "rgba(34,197,94,0.1)",
              color: "#059669",
              alignSelf: "flex-start",
            }}
          >
            {totalUnread} unread
          </span>
        </div>
        {onNewConversation && (
          <button
            onClick={onNewConversation}
            style={{
              width: 36,
              height: 36,
              background: "rgba(34,197,94,0.1)",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(34,197,94,0.18)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(34,197,94,0.1)")
            }
          >
            <Plus size={17} style={{ color: "#22c55e" }} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          padding: "8px 12px 0",
          borderBottom: "1px solid #f4f4f5",
          flexShrink: 0,
          display: "flex",
          gap: 2,
        }}
      >
        {(
          [
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
          ] as { key: TabType; label: string; count: number }[]
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                ...DM,
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                padding: "6px 10px 8px",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: isActive ? "#22c55e" : "#71717a",
                borderBottom: isActive ? "2px solid #22c55e" : "2px solid transparent",
                borderRadius: 0,
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "color 0.12s",
                marginBottom: -1,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.color = "#3f3f46";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.color = "#71717a";
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  style={{
                    ...DM,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 9999,
                    background: isActive
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(0,0,0,0.06)",
                    color: isActive ? "#059669" : "#71717a",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + Stage Filter */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #f4f4f5",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#a1a1aa",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchConversations}
            onChange={onSearchChange}
            placeholder="Search conversations..."
            style={{
              width: "100%",
              padding: "8px 10px 8px 30px",
              ...DM,
              fontSize: 13,
              color: "#3f3f46",
              background: "#f9f9f9",
              border: "1px solid #ebebeb",
              borderRadius: 9,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#22c55e";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(34,197,94,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#ebebeb";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        {/* Stage filter + Time filter row */}
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <select
              value={stageFilter ?? ""}
              onChange={(e) =>
                onStageFilterChange(e.target.value === "" ? null : e.target.value)
              }
              style={{
                width: "100%",
                padding: "7px 24px 7px 10px",
                ...DM,
                fontSize: 12,
                color: stageFilter ? "#0c1a0e" : "#a1a1aa",
                background: stageFilter ? "rgba(34,197,94,0.06)" : "#f9f9f9",
                border: stageFilter ? "1px solid rgba(34,197,94,0.35)" : "1px solid #ebebeb",
                borderRadius: 9,
                outline: "none",
                appearance: "none",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              <option value="">Stage...</option>
              <optgroup label="Lead Stage">
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Not Responding">Not Responding</option>
                <option value="Follow-up Needed">Follow-up Needed</option>
              </optgroup>
              <optgroup label="Interest Stage">
                <option value="Interested">Interested</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Asked for More Info">Asked for More Info</option>
              </optgroup>
              <optgroup label="Conversion Stage">
                <option value="Payment Pending">Payment Pending</option>
                <option value="Paid">Paid</option>
                <option value="Order Confirmed">Order Confirmed</option>
              </optgroup>
            </select>
            <ChevronDown
              size={12}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#a1a1aa",
                pointerEvents: "none",
              }}
            />
          </div>
          <div style={{ position: "relative", flex: 1 }}>
            <select
              value={timeFilter ?? ""}
              onChange={(e) =>
                onTimeFilterChange(e.target.value === "" ? null : (e.target.value as TimeFilterType))
              }
              style={{
                width: "100%",
                padding: "7px 24px 7px 10px",
                ...DM,
                fontSize: 12,
                color: timeFilter ? "#0c1a0e" : "#a1a1aa",
                background: timeFilter ? "rgba(34,197,94,0.06)" : "#f9f9f9",
                border: timeFilter ? "1px solid rgba(34,197,94,0.35)" : "1px solid #ebebeb",
                borderRadius: 9,
                outline: "none",
                appearance: "none",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              <option value="">Time...</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <ChevronDown
              size={12}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#a1a1aa",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {conversations.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: 24,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "#f4f4f5",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <MessageSquare size={22} style={{ color: "#d4d4d8" }} />
              </div>
              <div
                style={{
                  ...SYNE,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0c1a0e",
                  marginBottom: 4,
                }}
              >
                No conversations yet
              </div>
              <div style={{ ...DM, fontSize: 12, color: "#a1a1aa" }}>
                Start a conversation with your customers
              </div>
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
                style={{
                  padding: "11px 16px 11px 13px",
                  borderBottom: "1px solid #f9f9f9",
                  cursor: "pointer",
                  background: isSelected
                    ? "rgba(34,197,94,0.08)"
                    : "transparent",
                  borderLeft: isSelected
                    ? "3px solid #22c55e"
                    : "3px solid transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "rgba(34,197,94,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      background:
                        "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(34,197,94,0.2)",
                    }}
                  >
                    <span
                      style={{
                        ...SYNE,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {conversation.customerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          ...SYNE,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0c1a0e",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                          marginRight: 6,
                        }}
                      >
                        {conversation.customerName}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        {stageInfo.stage && (
                          <span
                            style={{
                              ...DM,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 9999,
                              maxWidth: 72,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              ...stageInfo.style,
                            }}
                          >
                            {stageInfo.stage}
                          </span>
                        )}
                        {conversation.unreadCount > 0 && (
                          <span
                            style={{
                              background: "#22c55e",
                              color: "#fff",
                              ...DM,
                              fontSize: 10,
                              fontWeight: 700,
                              minWidth: 18,
                              height: 18,
                              borderRadius: 9999,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "0 5px",
                            }}
                          >
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          ...DM,
                          fontSize: 12,
                          color: "#71717a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                          marginRight: 6,
                        }}
                      >
                        {conversation.lastMessage}
                      </span>
                      <span
                        style={{
                          ...DM,
                          fontSize: 11,
                          color: "#a1a1aa",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatLastMessageTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    <div
                      style={{
                        ...DM,
                        fontSize: 11,
                        color: "#d4d4d8",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {conversation.customerPhone}
                    </div>
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
