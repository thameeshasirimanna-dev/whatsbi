import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { Conversation, Message, GroupedMessage } from "./ConversationsPage";
import ProductSelectorModal from "./ProductSelectorModal";
import ServiceSelectorModal from "./ServiceSelectorModal";
import CustomerOrdersModal from "./CustomerOrdersModal";
import LeadStageModal from "./LeadStageModal";

interface TemplateData {
  is_template: boolean;
  name: string;
  language: { code: string };
  components: Array<{
    type: string;
    format?: string;
    text?: string;
    parameters?: any[];
    sub_type?: string;
    index?: number;
    buttons?: Array<{
      type: string;
      text: string;
      phone_number?: string;
      url?: string;
      payload?: string;
    }>;
  }>;
  dynamic_data: {
    header_params?: any[];
    body_params?: any[];
    buttons?: any[];
    media_header?: any;
  };
  rendered_body: string;
}

function parseTemplateMessage(text: string): TemplateData | null {
  if (typeof text !== "string" || !text.trim().startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed.is_template) {
      return parsed as TemplateData;
    }
  } catch (e) {
    console.error("Failed to parse template JSON:", e);
  }
  return null;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTemplateHeader(
  template: TemplateData,
  mediaType: string | null | undefined,
  mediaUrl: string | null
) {
  const headerComp = template.components.find(
    (c) => c.type.toLowerCase() === "header"
  );
  if (!headerComp) return null;

  const effectiveMediaType = mediaType || "none";

  if (effectiveMediaType !== "none" && mediaUrl) {
    // Media header
    return (
      <div className="mb-3">
        {effectiveMediaType === "image" && (
          <img
            src={mediaUrl}
            alt="Template header"
            className="max-w-full h-auto rounded-lg shadow-sm max-h-64 object-cover"
          />
        )}
        {effectiveMediaType === "video" && (
          <video
            src={mediaUrl}
            controls
            className="max-w-full h-auto rounded-lg shadow-sm max-h-64"
          />
        )}
        {effectiveMediaType === "document" && (
          <div className="border rounded-lg p-3 flex items-center space-x-3 bg-gray-50">
            <div className="p-2 rounded-full bg-gray-200">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Template Header Document
              </p>
              <p className="text-xs text-gray-500">View attached</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (headerComp.text) {
    // Text header
    let headerText = headerComp.text;
    if (template.dynamic_data.header_params && headerComp.parameters) {
      template.dynamic_data.header_params.forEach((param, i) => {
        const placeholder = `{{${i + 1}}}`;
        let paramValue = "";
        if (param?.text) paramValue = param.text;
        else if (param?.currency?.fallback_value)
          paramValue = param.currency.fallback_value;
        else if (param?.date_time?.fallback_value)
          paramValue = param.date_time.fallback_value;
        headerText = headerText.replace(
          new RegExp(escapeRegExp(placeholder), "g"),
          paramValue
        );
      });
    }
    return (
      <div className="mb-3">
        <h4 className="text-lg font-semibold text-gray-800">{headerText}</h4>
      </div>
    );
  }

  return null;
}

function renderTemplateBody(template: TemplateData) {
  return (
    <div className="mb-3">
      <p className="text-sm leading-relaxed break-words whitespace-pre-line">
        {template.rendered_body}
      </p>
    </div>
  );
}

function renderTemplateFooter(template: TemplateData) {
  const footerComp = template.components.find(
    (c) => c.type.toLowerCase() === "footer"
  );
  if (!footerComp || !footerComp.text) return null;

  let footerText = footerComp.text;
  // Footers typically don't have params, but handle if they do
  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs text-gray-500 italic">{footerText}</p>
    </div>
  );
}

function renderTemplateButtons(template: TemplateData) {
  const buttonsComp = template.components.find(
    (c) => c.type.toLowerCase() === "buttons"
  );
  if (!buttonsComp?.buttons || buttonsComp.buttons.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {buttonsComp.buttons.map((btn, index) => {
        const buttonText = btn.text || `Button ${index + 1}`;

        return (
          <button
            key={index}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={true} // Historical, no action
            title="Template button (historical)"
          >
            {buttonText}
          </button>
        );
      })}
    </div>
  );
}

interface MessageViewProps {
  selectedConversation: Conversation | null;
  newMessage: string;
  sending: boolean;
  sendError: string | null;
  onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFileSelect: (files: File[]) => void;
  uploading: boolean;
  hasPendingMedia: boolean;
  pendingMedia: Array<{
    id: string;
    url: string;
    media_type: string;
    filename: string;
  }>;
  onClearPendingMedia: () => void;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  onOpenTemplateModal?: () => void;
  onOpenContactDetails?: () => void;
  onSelectProduct?: (product: any) => void;
  onUpdateConversation?: (updatedConversation: Conversation) => void;
  agentPrefix?: string | null;
  agentId?: number | null;
  businessType?: string | null;
}

const MessageView: React.FC<MessageViewProps> = ({
  selectedConversation,
  newMessage,
  sending,
  sendError,
  onMessageChange,
  onSendMessage,
  onKeyPress,
  onFileSelect,
  uploading,
  hasPendingMedia,
  pendingMedia,
  onClearPendingMedia,
  messagesContainerRef,
  onOpenTemplateModal,
  onOpenContactDetails,
  onSelectProduct,
  onUpdateConversation,
  agentPrefix,
  agentId,
  businessType,
}) => {
  const isTemplateRequired = selectedConversation
    ? !selectedConversation.lastUserMessageTime ||
      (() => {
        const lastTime = new Date(selectedConversation.lastUserMessageTime);
        const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
        return hoursSince > 24;
      })()
    : false;
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showLeadStageModal, setShowLeadStageModal] = useState(false);
  const [serviceMessage, setServiceMessage] = useState("");
  const isProductBusiness = businessType === "product";
  const isServiceBusiness = businessType === "service";

  const currentStageInfo = selectedConversation
    ? (() => {
        const { conversionStage, interestStage, leadStage } =
          selectedConversation;
        if (conversionStage) {
          return {
            stage: conversionStage,
            color: "green" as const,
            className:
              "bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
          };
        } else if (interestStage) {
          return {
            stage: interestStage,
            color: "yellow" as const,
            className:
              "bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
          };
        } else if (leadStage) {
          return {
            stage: leadStage,
            color: "blue" as const,
            className:
              "bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
          };
        }
        return null;
      })()
    : null;

  const leadStageButtonClasses = currentStageInfo
    ? `p-2 bg-${currentStageInfo.color}-100 text-${currentStageInfo.color}-700 hover:bg-${currentStageInfo.color}-200 hover:text-${currentStageInfo.color}-900 rounded-lg transition-all duration-200 flex items-center shadow-sm hover:shadow-md`
    : "p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-900 rounded-lg transition-all duration-200 flex items-center shadow-sm hover:shadow-md";

  const handleStageUpdate = (newStages: {
    lead_stage: string;
    interest_stage: string | null;
    conversion_stage: string | null;
  }) => {
    if (selectedConversation && onUpdateConversation) {
      onUpdateConversation({
        ...selectedConversation,
        leadStage: newStages.lead_stage,
        interestStage: newStages.interest_stage,
        conversionStage: newStages.conversion_stage,
      });
    }
  };

  const handleProductSelect = (product: any) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    setShowProductModal(false);
  };

  const handleServiceSelect = async (service: any) => {
    // Trigger webhook for service selection
    if (agentId && selectedConversation?.customerPhone && agentPrefix) {
      try {
        // Get customer details
        const customersTable = `${agentPrefix}_customers`;
        const { data: customer } = await supabase
          .from(customersTable)
          .select("id, name, language")
          .eq("phone", selectedConversation.customerPhone)
          .eq("agent_id", agentId)
          .single();

        // Get agent profile from backend
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) return;

        const agentProfile = await response.json();
        if (!agentProfile.success || !agentProfile.agent) return;

        const agent = agentProfile.agent;

        if (agent.user_id) {
          const { data: config } = await supabase
            .from("whatsapp_configuration")
            .select("webhook_url, phone_number_id")
            .eq("user_id", agent.user_id)
            .single();

          if (config?.webhook_url && customer) {
            const webhookMessage = `Send me details about ${service.service_name}`;
            await fetch(config.webhook_url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                event: "service_selected",
                data: {
                  id: Date.now(), // Generate a unique ID
                  customer_id: customer.id,
                  message: webhookMessage,
                  direction: "outbound",
                  timestamp: new Date().toISOString(),
                  is_read: true,
                  media_type: "none",
                  media_url: null,
                  caption: null,
                  customer_phone: selectedConversation.customerPhone,
                  customer_name:
                    customer.name || selectedConversation.customerName,
                  customer_language: customer.language || "english",
                  agent_prefix: agentPrefix,
                  agent_user_id: agent.user_id,
                  phone_number_id: config.phone_number_id,
                  service_name: service.service_name,
                  agent_id: agentId,
                },
              }),
            });
            setServiceMessage(
              `Service "${service.service_name}" selected successfully!. Message sent to customer.`
            );
          }
        }
      } catch (error) {
        console.error("Failed to trigger service webhook:", error);
      }
    }

    setShowServiceModal(false);
  };
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);
  const documentInputRef = React.useRef<HTMLInputElement>(null);
  const attachButtonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Group consecutive outbound media messages for grid display
  const groupedMessages = useMemo((): GroupedMessage[] => {
    if (!selectedConversation?.messages) return [];
    const groups: GroupedMessage[] = [];
    let currentGroup: GroupedMessage | null = null;

    selectedConversation.messages.forEach((msg: Message) => {
      const isMedia =
        msg.media_type && msg.media_type !== "none" && msg.media_url;
      const isOutboundMedia =
        msg.sender === "agent" && isMedia && !(msg.text || "").trim(); // Empty text indicates grouped media

      if (
        isOutboundMedia &&
        currentGroup &&
        currentGroup.sender === "agent" &&
        currentGroup.media_type === msg.media_type
      ) {
        // Add to current group
        currentGroup.groupMedia!.push({
          url: msg.media_url!,
          type: msg.media_type!,
          caption: msg.caption,
        });
      } else {
        // End current group if exists
        if (currentGroup) {
          currentGroup.isGroup = (currentGroup.groupMedia?.length || 0) > 1;
          groups.push(currentGroup);
        }
        // Start new group or single message
        if (isOutboundMedia) {
          currentGroup = {
            ...msg,
            groupMedia: [
              {
                url: msg.media_url!,
                type: msg.media_type!,
                caption: msg.caption,
              },
            ],
            isGroup: false,
          } as GroupedMessage;
        } else {
          currentGroup = null;
          groups.push({ ...msg, isGroup: false } as GroupedMessage);
        }
      }
    });

    // Push last group
    if (currentGroup) {
      (currentGroup as GroupedMessage).isGroup =
        ((currentGroup as GroupedMessage).groupMedia?.length || 0) > 1;
      groups.push(currentGroup as GroupedMessage);
    }

    return groups;
  }, [selectedConversation?.messages]);

  // Auto-expand textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 128) + "px"; // max 128px ~ 8 lines
    }
  }, [newMessage]);

  // Close menu on outside click
  useEffect(() => {
    if (!showAttachMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        attachButtonRef.current &&
        !attachButtonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttachMenu]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    let processedText = e.clipboardData.getData("text/plain");

    // Always start with plain text to ensure non-list text is preserved
    // Normalize line endings
    processedText = processedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    let usedHtml = false;
    // Try HTML for structured text extraction
    const html = e.clipboardData.getData("text/html");
    if (html) {
      usedHtml = true;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const body = doc.body;

        // Function to extract structured text recursively
        function extractStructuredText(node: Node): string {
          let text = "";
          if (node.nodeType === Node.TEXT_NODE) {
            return (node.textContent || "").trim();
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tag = el.tagName.toLowerCase();
            let childrenText = "";
            if (["ul", "ol"].includes(tag)) {
              // Handle lists by processing each li
              const items: string[] = [];
              const lis = el.querySelectorAll("li");
              const isOrdered = tag === "ol";
              lis.forEach((li, index) => {
                const liNode = li as Node;
                const liText = extractStructuredText(liNode).trim();
                if (liText) {
                  let prefix = isOrdered ? `${index + 1}. ` : "• ";
                  const cleanText = liText
                    .replace(/^(•|\-|\*|\d+\.)\s*/i, "")
                    .trim();
                  items.push(prefix + cleanText);
                }
              });
              return items.join("\n") + "\n\n";
            } else if (["li"].includes(tag)) {
              // For li, extract children but without prefix (handled in parent)
              childrenText = Array.from(el.childNodes)
                .map(extractStructuredText)
                .join(" ")
                .trim();
              return childrenText;
            } else {
              // For block elements, join children and add newline
              const blockTags = [
                "p",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "div",
                "blockquote",
                "pre",
              ];
              if (blockTags.includes(tag)) {
                childrenText = Array.from(el.childNodes)
                  .map(extractStructuredText)
                  .join(" ")
                  .trim();
                if (childrenText) {
                  return childrenText + "\n\n";
                }
                return "";
              } else if (tag === "br") {
                return "\n";
              } else {
                // Inline elements, join with space
                childrenText = Array.from(el.childNodes)
                  .map(extractStructuredText)
                  .filter((t) => t)
                  .join(" ");
                return childrenText;
              }
            }
          }
          return text;
        }

        let fullText = extractStructuredText(body);
        processedText = fullText.replace(/\n{3,}/g, "\n\n").trim();

        // Detect if lists were processed
        const lists = body.querySelectorAll("ul, ol");
        const listItems = body.querySelectorAll("li");
        if (lists.length > 0) {
          // Processed HTML with lists and non-list content
        } else {
          // Processed HTML as non-list structured text
        }
      } catch (err) {
        console.error("Failed to parse HTML clipboard:", err);
        usedHtml = false;
      }
    }

    // Plain text heuristic for lists - only if no HTML was processed
    if (!usedHtml) {
      const lines = processedText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);
      if (lines.length > 1) {
        const hasExistingPrefix = lines.some((line) =>
          /^[\d+\.\s*•\-\*]/.test(line)
        );
        if (!hasExistingPrefix) {
          const allCapitalStart = lines.every((line) => /^[A-Z]/.test(line));
          const allShortSimple = lines.every((line) => {
            return (
              (line.length < 100 && !line.includes(".")) ||
              line.split(".").length < 3
            );
          });
          const isLikelyList = allCapitalStart && allShortSimple;
          if (isLikelyList) {
            processedText = lines.map((line) => "• " + line).join("\n");
          }
        }
      }
    }

    processedText = processedText.trim();

    const textarea = e.currentTarget;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = newMessage.substring(0, start);
    const after = newMessage.substring(end);
    const newValue = before + processedText + after;

    onMessageChange({
      target: { value: newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>);

    // Set cursor position after paste
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd =
        start + processedText.length;
      textarea.focus();
    }, 0);
  };
  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
      {/* No conversation selected */}
      {!selectedConversation && (
        <div className="flex flex-col justify-start bg-gradient-to-br from-gray-50 to-gray-100 h-full pt-12">
          <div className="text-center p-12 max-w-lg mx-auto">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-gray-200">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              No conversation selected
            </h3>
            <p className="text-gray-600 text-xl leading-relaxed mb-6">
              Choose a conversation from the left sidebar to start chatting with
              your customers
            </p>
            <div className="text-sm text-gray-500">
              <p>💬 Messages will appear here once you select a conversation</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Header - only show when conversation is selected */}
      {selectedConversation && (
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center space-x-4 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors flex-1"
              onClick={onOpenContactDetails}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {selectedConversation.customerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-semibold text-gray-900 truncate">
                      {selectedConversation.customerName}
                    </h3>
                    {selectedConversation ? (
                      !selectedConversation.lastUserMessageTime ? (
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Out of free messages
                        </div>
                      ) : (
                        (() => {
                          const lastTime = new Date(
                            selectedConversation.lastUserMessageTime
                          );
                          const hoursSince =
                            (Date.now() - lastTime.getTime()) /
                            (1000 * 60 * 60);
                          const isExpired = hoursSince > 24;
                          return (
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isExpired
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {isExpired
                                ? "Template Required"
                                : "Free Messaging"}
                            </div>
                          );
                        })()
                      )
                    ) : (
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Free Messaging
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {selectedConversation.customerPhone}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentStageInfo && (
                <span
                  className={`text-xs font-medium ${currentStageInfo.className}`}
                >
                  {currentStageInfo.stage}
                </span>
              )}
              <button
                onClick={() => setShowLeadStageModal(true)}
                className={leadStageButtonClasses}
                title="View Lead Stage"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setShowOrdersModal(true)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center shadow-sm"
                title="View Orders"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages - only show when conversation is selected */}
      {selectedConversation && (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-hidden pt-4">
          {selectedConversation.messages.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
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
                      strokeWidth="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No messages yet
                </h3>
                <p className="text-gray-500">
                  Start the conversation by sending a message
                </p>
              </div>
            </div>
          ) : (
            <div
              className="flex-1 overflow-y-auto space-y-6 pb-4 pl-4 custom-scrollbar"
              ref={messagesContainerRef}
            >
              {groupedMessages.map((messageOrGroup: GroupedMessage) => {
                const isGroup = messageOrGroup.isGroup || false;
                const msg = messageOrGroup;
                const key = isGroup ? `group-${msg.id}` : msg.id;

                return (
                  <div
                    key={key}
                    className={`flex mt-4 mb-4 last:mb-20 ${
                      msg.sender === "customer"
                        ? "justify-start"
                        : "justify-end"
                    } animate-in slide-in-from-${
                      msg.sender === "customer" ? "left" : "right"
                    } fade-in duration-300`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-4 rounded-2xl shadow-md transform transition-all duration-200 mx-2 ${
                        msg.sender === "customer"
                          ? "bg-white text-gray-900 rounded-br-lg border border-gray-200"
                          : "bg-gradient-to-r from-green-50 to-green-100 text-gray-900 rounded-bl-lg border border-green-200"
                      }`}
                    >
                      <div className="space-y-3 flex-1">
                        {(() => {
                          const template = parseTemplateMessage(msg.text || "");
                          if (template && msg.sender === "agent") {
                            return (
                              <div className="space-y-3">
                                {renderTemplateHeader(
                                  template,
                                  msg.media_type || "none",
                                  msg.media_url ?? null
                                )}
                                {renderTemplateBody(template)}
                                {renderTemplateFooter(template)}
                                {renderTemplateButtons(template)}
                              </div>
                            );
                          }

                          // Regular message with media or group
                          if (
                            isGroup &&
                            msg.groupMedia &&
                            msg.groupMedia.length > 1 &&
                            msg.media_type === "image"
                          ) {
                            // Render grid for multiple images
                            return (
                              <div className="mb-2">
                                <div
                                  className={`grid ${
                                    msg.groupMedia.length === 2
                                      ? "grid-cols-2"
                                      : "grid-cols-2 md:grid-cols-3"
                                  } gap-2`}
                                >
                                  {msg.groupMedia.map((mediaItem, index) => (
                                    <div key={index} className="relative">
                                      <img
                                        src={mediaItem.url}
                                        alt={
                                          mediaItem.caption ||
                                          `Shared image ${index + 1}`
                                        }
                                        className="w-full h-48 object-cover rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() =>
                                          window.open(mediaItem.url, "_blank")
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                                {msg.caption && (msg.caption || "").trim() && (
                                  <p className="text-xs text-gray-500 mt-2 italic">
                                    {msg.caption}
                                  </p>
                                )}
                              </div>
                            );
                          }

                          // Single media or non-group
                          return (
                            <>
                              {msg.media_type &&
                                msg.media_type !== "none" &&
                                msg.media_url && (
                                  <div className="mb-2">
                                    {msg.media_type === "image" && (
                                      <div className="relative">
                                        <img
                                          src={msg.media_url}
                                          alt={msg.caption || "Shared image"}
                                          className="max-w-full h-auto rounded-lg shadow-sm max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() =>
                                            msg.media_url &&
                                            window.open(msg.media_url, "_blank")
                                          }
                                        />
                                      </div>
                                    )}
                                    {msg.media_type === "video" && (
                                      <div className="relative">
                                        <video
                                          src={msg.media_url}
                                          controls
                                          className="max-w-full h-auto rounded-lg shadow-sm max-h-96"
                                          preload="metadata"
                                        >
                                          Your browser does not support the
                                          video tag.
                                        </video>
                                      </div>
                                    )}
                                    {msg.media_type === "audio" && (
                                      <div className="bg-gray-100 rounded-lg p-3">
                                        <audio
                                          src={msg.media_url}
                                          controls
                                          className="w-full max-w-sm"
                                          preload="metadata"
                                        >
                                          Your browser does not support the
                                          audio tag.
                                        </audio>
                                      </div>
                                    )}
                                    {msg.media_type === "document" && (
                                      <div
                                        className={`border rounded-lg p-3 flex items-center space-x-3 ${
                                          msg.sender === "customer"
                                            ? "border-gray-300 bg-gray-50"
                                            : "border-gray-300 bg-gray-50"
                                        }`}
                                      >
                                        <div
                                          className={`p-2 rounded-full ${
                                            msg.sender === "customer"
                                              ? "bg-gray-200"
                                              : "bg-gray-200"
                                          }`}
                                        >
                                          <svg
                                            className="w-5 h-5 text-gray-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                          </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            Document
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            Click to view
                                          </p>
                                        </div>
                                        <button
                                          onClick={() =>
                                            msg.media_url &&
                                            window.open(msg.media_url, "_blank")
                                          }
                                          className={`p-2 rounded-full transition-colors ${
                                            msg.sender === "customer"
                                              ? "hover:bg-gray-200 text-gray-600"
                                              : "hover:bg-gray-200 text-gray-600"
                                          }`}
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                    {msg.media_type === "sticker" && (
                                      <div className="relative">
                                        <img
                                          src={msg.media_url}
                                          alt="Sticker"
                                          className="w-32 h-32 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() =>
                                            msg.media_url &&
                                            window.open(msg.media_url, "_blank")
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              {msg.text &&
                                (msg.text || "").trim() &&
                                !msg.text.startsWith("[") &&
                                !msg.text.startsWith("Media file") && (
                                  <p className="text-sm leading-relaxed break-words whitespace-pre-line">
                                    {msg.text}
                                  </p>
                                )}
                            </>
                          );
                        })()}
                      </div>
                      <div
                        className={`mt-2 pt-1 flex ${
                          msg.sender === "customer"
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <span className="text-xs text-gray-500 select-none">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Message Input - only show when conversation is selected */}
      {selectedConversation && (
        <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg flex-shrink-0">
          {/* Media Preview */}
          {pendingMedia.length > 0 && (
            <div className="mb-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Media Preview ({pendingMedia.length} items)
                </h4>
                <button
                  onClick={onClearPendingMedia}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove media"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {pendingMedia.map((media, index) => (
                  <div key={index} className="relative w-20 h-20 flex-shrink-0">
                    {media.media_type === "image" && (
                      <img
                        src={media.url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-gray-200"
                      />
                    )}
                    {(media.media_type === "video" ||
                      media.media_type === "audio" ||
                      media.media_type === "document") && (
                      <div className="w-full h-full rounded-lg border border-gray-200 flex items-center justify-center bg-gray-100">
                        {media.media_type === "video" && (
                          <svg
                            className="w-8 h-8 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {media.media_type === "audio" && (
                          <svg
                            className="w-8 h-8 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9.383 3.076A1 1 0 0110 4v10a1 1 0 01-.617.921L6 16a1 1 0 01-1.414-1.414l3.536-3.536A1 1 0 019 11V5a1 1 0 01.383-.924z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {media.media_type === "document" && (
                          <svg
                            className="w-8 h-6 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-600">
                💡 Add a caption below - it will apply to all media
              </div>
            </div>
          )}

          <div className="flex items-end space-x-3">
            {/* Product Button - only if business type is product */}
            {isProductBusiness && (
              <button
                onClick={() => setShowProductModal(true)}
                disabled={sending || uploading || isTemplateRequired}
                className={`p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md ${
                  isTemplateRequired
                    ? "bg-gray-100 text-gray-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={
                  isTemplateRequired ? "Template required" : "Select Product"
                }
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </button>
            )}

            {/* Service Button - only if business type is service */}
            {isServiceBusiness && (
              <button
                onClick={() => {
                  setServiceMessage("");
                  setShowServiceModal(true);
                }}
                disabled={sending || uploading || isTemplateRequired}
                className={`p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md ${
                  isTemplateRequired
                    ? "bg-gray-100 text-gray-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={
                  isTemplateRequired ? "Template required" : "Select Service"
                }
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2zm-4 6v4m0 0V15m4 4h-4m4-4H9"
                  />
                </svg>
              </button>
            )}

            {/* File Upload Button */}
            <div className="relative">
              <button
                ref={attachButtonRef}
                onClick={() => setShowAttachMenu((prev) => !prev)}
                disabled={sending || uploading || isTemplateRequired}
                className={`p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md ${
                  hasPendingMedia
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={
                  hasPendingMedia
                    ? "Media attached - click to add more"
                    : isTemplateRequired
                    ? "Template required"
                    : "Attach media"
                }
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : hasPendingMedia ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                )}
              </button>

              {showAttachMenu && (
                <div
                  ref={menuRef}
                  className="absolute bottom-full left-0 mb-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-48"
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        imageInputRef.current?.click();
                      }}
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                    >
                      <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Images</span>
                    </button>
                    <button
                      onClick={() => {
                        videoInputRef.current?.click();
                      }}
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                    >
                      <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Videos</span>
                    </button>
                    <button
                      onClick={() => {
                        audioInputRef.current?.click();
                      }}
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                    >
                      <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7V5z"
                        />
                      </svg>
                      <span>Audio</span>
                    </button>
                    <button
                      onClick={() => {
                        documentInputRef.current?.click();
                      }}
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                    >
                      <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Documents</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden File Inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    onFileSelect(files);
                  }
                  e.target.value = "";
                  setShowAttachMenu(false);
                }}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onFileSelect([file]);
                  }
                  e.target.value = "";
                  setShowAttachMenu(false);
                }}
                className="hidden"
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onFileSelect([file]);
                  }
                  e.target.value = "";
                  setShowAttachMenu(false);
                }}
                className="hidden"
              />
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onFileSelect([file]);
                  }
                  e.target.value = "";
                  setShowAttachMenu(false);
                }}
                className="hidden"
              />
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  onFileSelect(files);
                }
                e.target.value = "";
                setShowAttachMenu(false);
              }}
              className="hidden"
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onFileSelect([file]);
                }
                e.target.value = "";
                setShowAttachMenu(false);
              }}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onFileSelect([file]);
                }
                e.target.value = "";
                setShowAttachMenu(false);
              }}
              className="hidden"
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onFileSelect([file]);
                }
                e.target.value = "";
                setShowAttachMenu(false);
              }}
              className="hidden"
            />

            <textarea
              ref={textareaRef}
              rows={1}
              value={newMessage}
              onChange={onMessageChange}
              onKeyDown={onKeyPress}
              onPaste={handlePaste}
              placeholder={
                isTemplateRequired
                  ? "Template required to message"
                  : "Type your message..."
              }
              className={`flex-1 px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50 resize-none placeholder-gray-500 min-h-[44px] max-h-32 overflow-y-auto whitespace-pre-wrap ${
                isTemplateRequired ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
              disabled={sending || uploading || isTemplateRequired}
            />
            <button
              onClick={onSendMessage}
              disabled={
                (!newMessage.trim() && !hasPendingMedia) ||
                sending ||
                uploading ||
                isTemplateRequired
              }
              className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
          {isTemplateRequired && onOpenTemplateModal && (
            <button
              onClick={onOpenTemplateModal}
              className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors w-full"
            >
              Send Template Message
            </button>
          )}

          {isProductBusiness && (
            <ProductSelectorModal
              isOpen={showProductModal}
              onClose={() => setShowProductModal(false)}
              onSelectProduct={handleProductSelect}
              agentPrefix={agentPrefix}
              agentId={agentId}
            />
          )}

          {isServiceBusiness && (
            <ServiceSelectorModal
              isOpen={showServiceModal}
              onClose={() => setShowServiceModal(false)}
              onSelectService={handleServiceSelect}
            />
          )}

          <LeadStageModal
            isOpen={showLeadStageModal}
            onClose={() => setShowLeadStageModal(false)}
            customerPhone={selectedConversation?.customerPhone || null}
            customerName={selectedConversation?.customerName || ""}
            agentPrefix={agentPrefix || null}
            agentId={agentId || null}
            onStageUpdate={handleStageUpdate}
          />
          <CustomerOrdersModal
            isOpen={showOrdersModal}
            onClose={() => setShowOrdersModal(false)}
            customerPhone={selectedConversation?.customerPhone || null}
            customerName={selectedConversation?.customerName || ""}
            agentPrefix={agentPrefix || null}
            agentId={agentId || null}
          />

          {serviceMessage && (
            <p className="text-xs text-green-600 mt-3 px-1">{serviceMessage}</p>
          )}
          {sendError && (
            <p className="text-xs text-red-500 mt-3 px-1">{sendError}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageView;
