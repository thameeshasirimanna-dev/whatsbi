import React, { useEffect, useRef } from "react";
import { Conversation } from "./ConversationsPage";

interface ConversationListProps {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  searchConversations: string;
  selectedConversationId: number | null;
  totalUnread: number;
  displayedConversations: number;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation?: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  filteredConversations,
  searchConversations,
  selectedConversationId,
  totalUnread,
  displayedConversations,
  onSearchChange,
  onSelectConversation,
  onNewConversation,
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
        className: "bg-green-100 text-green-800",
      };
    } else if (interestStage) {
      return {
        stage: interestStage,
        className: "bg-yellow-100 text-yellow-800",
      };
    } else if (leadStage) {
      return { stage: leadStage, className: "bg-blue-100 text-blue-800" };
    } else {
      return { stage: null, className: "" };
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 flex-shrink-0">
        <div className="flex items-stretch justify-between">
          <div className="flex flex-col space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
              {totalUnread} unread
            </span>
          </div>
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="flex items-center justify-center ml-4 h-16 w-16 text-green-600 bg-green-100 hover:bg-green-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-lg"
            >
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <input
          type="text"
          value={searchConversations}
          onChange={onSearchChange}
          placeholder="Search conversations..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50/50 placeholder-gray-500"
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversations yet
              </h3>
              <p className="text-gray-500 text-sm">
                Start a conversation with your customers
              </p>
            </div>
          </div>
        ) : (
          <>
            {filteredConversations.map((conversation, index) => (
              <div
                key={`${conversation.id}-${index}`}
                ref={
                  selectedConversationId === conversation.id
                    ? selectedConversationRef
                    : null
                }
                className={`px-4 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
                  selectedConversationId === conversation.id
                    ? "bg-green-50 border-r-4 border-green-500 shadow-md"
                    : ""
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">
                      {conversation.customerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate pr-4 mr-auto">
                        {conversation.customerName}
                      </h3>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const stageInfo = getCurrentStageInfo(conversation);
                          return stageInfo.stage ? (
                            <span
                              className={`w-20 truncate px-2 py-0.5 rounded-full text-xs font-medium ${stageInfo.className} flex-shrink-0`}
                            >
                              {stageInfo.stage}
                            </span>
                          ) : null;
                        })()}
                        {conversation.unreadCount > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white shadow-sm">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate max-w-[200px] font-medium">
                        {conversation.lastMessage}
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {conversation.lastMessageTime}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 truncate">
                      {conversation.customerPhone}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
