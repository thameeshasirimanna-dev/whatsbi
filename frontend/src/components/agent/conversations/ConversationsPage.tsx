import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import ConversationList from "./ConversationList";
import MessageView from "./MessageView";
import ContactDetails from "./ContactDetails";
import ProductSelectorModal from "./ProductSelectorModal";
import ViewTemplateModal from "../templates/ViewTemplateModal";
import { Eye } from "lucide-react";
// Auth utilities - JWT token based
const getToken = () => {
  return localStorage.getItem("auth_token");
};

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getUser = async () => {
  try {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/get-current-user`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    if (response.ok && data.success) {
      return { data: { user: data.user }, error: null };
    } else {
      return {
        data: { user: null },
        error: data.message || "Failed to get user",
      };
    }
  } catch (error) {
    return { data: { user: null }, error };
  }
};

export interface Message {
  id: string | number;
  text: string;
  sender: "agent" | "customer";
  timestamp: string;
  rawTimestamp?: number;
  isRead?: boolean;
  media_type?: "none" | "image" | "video" | "audio" | "document" | "sticker";
  media_url?: string | null;
  caption?: string | null;
}

export interface GroupedMessage extends Message {
  isGroup?: boolean;
  groupMedia?: Array<{ url: string; type: string; caption?: string | null }>;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  images?: string[];
  category_id?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  last_user_message_time?: string | null;
  aiEnabled?: boolean;
}

export interface Conversation {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  rawLastTimestamp: number;
  unreadCount: number;
  lastUserMessageTime?: string | null;
  aiEnabled?: boolean;
  leadStage?: string | null;
  interestStage?: string | null;
  conversionStage?: string | null;
  messages: Message[];
}
const processMessageText = (
  rawText: string | undefined | null,
  mediaType: string | null,
  caption: string | null
): string => {
  const text = (rawText || "").trim();
  if (text) {
    try {
      JSON.parse(text);
      return "[TEMPLATE]";
    } catch (e) {
      // Not JSON, return original
      return text;
    }
  }
  if (mediaType && mediaType !== "none") {
    return caption || `[${mediaType.toUpperCase()}]`;
  }
  return "No message content";
};

const ConversationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  const [searchConversations, setSearchConversations] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "ai" | "orders">("all");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<"today" | "yesterday" | "week" | "month" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSentMessageId, setLastSentMessageId] = useState<
    (string | number)[] | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState(Date.now());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingMedia, setPendingMedia] = useState<
    Array<{
      id: string;
      url: string;
      media_type: string;
      filename: string;
    }>
  >([]);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [paramInputs, setParamInputs] = useState<{ [key: number]: string }>({});
  const [requiresMediaHeader, setRequiresMediaHeader] = useState(false);
  const [templateMediaUpload, setTemplateMediaUpload] = useState(false);
  const [templateMedia, setTemplateMedia] = useState<{
    id: string;
    type: string;
    url?: string;
  } | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedViewTemplate, setSelectedViewTemplate] = useState<any>(null);
  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>(
    {}
  );

  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewConversationModal, setShowNewConversationModal] =
    useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState<{
    name: string;
    phone: string;
  }>({ name: "", phone: "" });
  const [selectedConversationCountryCode, setSelectedConversationCountryCode] =
    useState("+94");

  const [lastSentProducts, setLastSentProducts] = useState<{
    [key: number]: Product;
  }>({});
  const [messageOffset, setMessageOffset] = useState<{ [key: number]: number }>(
    {}
  );
  const [hasMoreMessages, setHasMoreMessages] = useState<{
    [key: number]: boolean;
  }>({});
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [messagesWerePrepended, setMessagesWerePrepended] = useState(false);
  const [messagesPrependedCount, setMessagesPrependedCount] = useState(0);
  const handleProductSelect = async (product: Product) => {
    if (!selectedConversationId || !selectedConversation) {
      setSendError("No conversation selected");
      return;
    }

    // Check 24h window
    if (selectedConversation.lastUserMessageTime) {
      const lastTime = new Date(selectedConversation.lastUserMessageTime);
      const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        setTemplateError("Template required after 24h window");
        setShowTemplateModal(true);
        return;
      }
    }

    setSending(true);
    setSendError(null);

    try {
      const userResult = await getUser();
      if (userResult.error || !userResult.data.user)
        throw new Error("Not authenticated");
      const user = userResult.data.user;

      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const formattedPhone = selectedConversation.customerPhone.replace(
        /[\s+]/g,
        ""
      );

      // Trigger agent's webhook with product details and command (regardless of ai_enabled)

      // Refresh conversation
      await fetchSelectedConversation();

      // Trigger agent's webhook with product details and command (regardless of ai_enabled)
      try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${
            user.id
          }`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const configData = await response.json();
          if (configData.success && configData.whatsapp_config) {
            const config =
              configData.whatsapp_config[0] || configData.whatsapp_config;
            if (config?.webhook_url) {
              const combinedText = `I want full details of ${product.name} and sku is ${product.id} without images.`;

              const webhookPayload = {
                event: "message_received",
                jwt_token: token,
                data: {
                  id: `product-select-${Date.now()}`,
                  customer_id: selectedConversation.customerId,
                  message: combinedText,
                  direction: "inbound",
                  timestamp: new Date().toISOString(),
                  is_read: false,
                  media_type: "none",
                  media_url: null,
                  caption: null,
                  customer_phone: formattedPhone,
                  customer_name: selectedConversation.customerName,
                  agent_prefix: agentPrefix,
                  agent_user_id: user.id,
                  phone_number_id: config.phone_number_id || null,
                },
              };

              let webhookResponse = await fetch(config.webhook_url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(webhookPayload),
              });

              if (webhookResponse.status === 404 && config.webhook_url.includes('/webhook/')) {
                const testWebhookUrl = config.webhook_url.replace('/webhook/', '/webhook-test/');
                webhookResponse = await fetch(testWebhookUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(webhookPayload),
                });
              }

              if (webhookResponse.ok) {
              } else {
                const errorText = await webhookResponse.text();
              }
            } else {
            }
          }
        }
      } catch (webhookError) {}

      // Send images directly from our side
      const imageResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/send-product-images`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            agent_prefix: agentPrefix,
            product_id: parseInt(product.id),
            customer_phone: formattedPhone,
          }),
        }
      );
      const imageData = await imageResponse.json();
      const imageError = !imageResponse.ok
        ? { message: imageData.error }
        : null;

      if (imageError || !imageData?.success) {
        setSendError(
          `Failed to send product images: ${
            imageError?.message || imageData?.message
          }`
        );
      } else {
      }
    } catch (err: any) {
      setSendError(`Failed to send product: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const [showContactDetails, setShowContactDetails] = useState(false);
  const [isMac, setIsMac] = useState(false);

  const fetchTemplatesForModal = async () => {
    if (!agentId) return;

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-templates?is_active=true`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        setTemplateError("Failed to load templates");
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Filter out invoice_template
        const filteredTemplates = data.templates.filter(
          (t: any) => t.name !== "invoice_template"
        );
        setTemplates(filteredTemplates);
        setTemplateError(null);
      } else {
        setTemplateError("Failed to load templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplateError("Failed to load templates");
    }
  };

  const handleTemplateMediaSelect = async (file: File) => {
    if (!selectedTemplate) return;

    setTemplateMediaUpload(true);
    setTemplateError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", ""); // No caption for header

      const uploadResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/upload-media`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const uploadResult = await uploadResponse.json();
      const uploadError = !uploadResponse.ok
        ? { message: uploadResult.error }
        : null;

      let errMsg;
      if (uploadError) {
        errMsg = uploadError.message || "Failed to upload media";
      } else {
        errMsg = uploadResult?.error || "Failed to upload media";
      }

      if (uploadError || !uploadResult?.success) {
        throw new Error(errMsg);
      }

      const mediaItem = uploadResult.media?.[0];
      if (!mediaItem) {
        throw new Error("No media in response");
      }

      // Determine type from template header format
      const headerComp = selectedTemplate.body.components?.find(
        (c: any) => c.type === "HEADER"
      );
      const mediaType = headerComp?.format?.toLowerCase() || "image";

      setTemplateMedia({
        id: mediaItem.media_id,
        type: mediaType,
        url: mediaItem.media_download_url,
      });
    } catch (error: any) {
      setTemplateError(`Failed to upload media: ${error.message}`);
    } finally {
      setTemplateMediaUpload(false);
    }
  };

  const parseVariables = (bodyText: string) => {
    const matches = bodyText.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    const numbers = matches
      .map((m) => parseInt(m.slice(2, -1)))
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);
    return numbers;
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    const vars = parseVariables(
      template.body.components.find((c: any) => c.type === "BODY")?.text || ""
    );
    setTemplateParams(Array(vars.length).fill(""));
    setParamInputs({});
  };

  const handleParamChange = (index: number, value: string) => {
    const newParams = [...templateParams];
    newParams[index] = value;
    setTemplateParams(newParams);
    setParamInputs((prev) => ({ ...prev, [index]: value }));
  };

  const sendTemplateMessage = async () => {
    if (!selectedConversationId || !selectedConversation || !selectedTemplate) {
      setTemplateError("Please select a template and fill all parameters");
      return;
    }

    // For welcome_template, automatically use agent's name as business_name
    let finalTemplateParams = [...templateParams];
    if (selectedTemplate.name === "welcome_template") {
      finalTemplateParams = [agentName || "Our Business"];
    } else if (templateParams.some((p) => !p.trim())) {
      setTemplateError("Please fill all parameters");
      return;
    }

    // Check media header if required
    if (requiresMediaHeader && !templateMedia) {
      setTemplateError("Please upload media for the template header");
      return;
    }

    const messageText =
      selectedTemplate.body.components
        .find((c: any) => c.type === "BODY")
        ?.text.replace(/\{\{(\d+)\}\}/g, (match: string, num: string) => {
          const idx = parseInt(num) - 1;
          return templateParams[idx] || `[${num}]`;
        }) || selectedTemplate.name;

    // Optimistic update

    setSending(true);
    setTemplateError(null);

    try {
      const userResult = await getUser();
      if (userResult.error || !userResult.data.user)
        throw new Error("Not authenticated");
      const user = userResult.data.user;

      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const formattedPhone = selectedConversation.customerPhone.replace(
        /[\s+]/g,
        ""
      );

      const payload: any = {
        user_id: user.id,
        customer_phone: formattedPhone,
        type: "template",
        template_name: selectedTemplate.name,
        template_params: finalTemplateParams.map((param) => ({
          type: "text",
          text: param,
        })),
        header_params:
          selectedTemplate.name === "welcome_template"
            ? [
                {
                  type: "text",
                  text: agentName || "Our Business",
                },
              ]
            : [],
        category: "utility",
      };

      if (templateMedia) {
        payload.media_header = {
          type: templateMedia.type,
          id: templateMedia.id,
        };
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/send-whatsapp-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      const error = !response.ok
        ? { message: data.error || "Failed to send media" }
        : null;

      if (error || !data?.success) {
        const errorMsg =
          data?.error || error?.message || "Failed to send template";
        if (errorMsg.includes("Insufficient credits")) {
          setTemplateError(
            "Insufficient credits for template message. Please add credits in Settings."
          );
        } else {
          throw new Error(errorMsg);
        }
      } else {
        // Success, close modal and show feedback
        setShowTemplateModal(false);
        setSelectedTemplate(null);
        setTemplateParams([]);
        setParamInputs({});
        setTemplateMedia(null);
        setRequiresMediaHeader(false);
        setSendError("Template sent successfully. 0.01 credits deducted.");

        // Sync selected conversation with DB
        await fetchSelectedConversation();
      }
    } catch (err: any) {
      if (!err.message.includes("Insufficient credits")) {
        setTemplateError(`Failed to send template: ${err.message}`);
      }
    } finally {
      setSending(false);
      setLastSentMessageId(null);
    }
  };

  useEffect(() => {
    if (showTemplateModal) {
      fetchTemplatesForModal();
    }
  }, [showTemplateModal, agentPrefix, agentId]);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  const selectedConversationIdRef = useRef(selectedConversationId);
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Socket.IO connection
  useEffect(() => {
    if (!agentId) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    let socketUrl = window.location.origin;
    let socketPath = "/socket.io/";

    const isLocalhost = (urlStr: string) => {
      try {
        const url = new URL(urlStr);
        return url.hostname === "localhost" || url.hostname === "127.0.0.1";
      } catch (e) {
        return false;
      }
    };

    const browserIsLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const backendIsLocal = isLocalhost(backendUrl);

    if (backendUrl && backendUrl !== "undefined" && (backendUrl.startsWith("http://") || backendUrl.startsWith("https://")) && (!backendIsLocal || browserIsLocal)) {
      try {
        const parsedUrl = new URL(backendUrl);
        socketUrl = parsedUrl.origin;
        if (parsedUrl.pathname && parsedUrl.pathname !== "/") {
          const cleanPath = parsedUrl.pathname.endsWith("/") ? parsedUrl.pathname : `${parsedUrl.pathname}/`;
          socketPath = `${cleanPath}socket.io/`;
        }
      } catch (e) {
        console.error("Failed to parse VITE_BACKEND_URL for socket connection:", e);
      }
    }

    let activeSocket: Socket | null = null;
    let fallbackAttempted = false;

    const initSocket = (url: string, path: string) => {
      const s = io(url, {
        transports: ["polling", "websocket"],
        path: path,
        reconnectionAttempts: 5,
        timeout: 7000,
      });

      s.on("connect", () => {
        const token = getToken();
        s.emit("join-agent-room", { agentId, token });
      });

      s.on("connect_error", (error) => {
        console.error(`Socket connection error on path ${path}:`, error);
        
        if (!fallbackAttempted) {
          fallbackAttempted = true;
          s.disconnect();

          let fallbackUrl = window.location.origin;
          let fallbackPath = "/socket.io/";

          // Toggle path fallback
          if (path === "/socket.io/") {
            // Fallback from base path to prefix path if backendUrl has prefix
            if (backendUrl && backendUrl !== "undefined" && (backendUrl.startsWith("http://") || backendUrl.startsWith("https://"))) {
              try {
                const parsedUrl = new URL(backendUrl);
                fallbackUrl = parsedUrl.origin;
                if (parsedUrl.pathname && parsedUrl.pathname !== "/") {
                  const cleanPath = parsedUrl.pathname.endsWith("/") ? parsedUrl.pathname : `${parsedUrl.pathname}/`;
                  fallbackPath = `${cleanPath}socket.io/`;
                }
              } catch (e) {}
            } else if (backendUrl && backendUrl !== "undefined" && backendUrl.startsWith("/")) {
              const cleanPath = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;
              fallbackPath = `${cleanPath}socket.io/`;
            }
          } else {
            // Fallback from prefix path back to base path
            fallbackUrl = window.location.origin;
            fallbackPath = "/socket.io/";
          }

          activeSocket = initSocket(fallbackUrl, fallbackPath);
          setSocket(activeSocket);
        }
      });

      s.on("error", (error) => {
        console.error("Socket error event:", error);
      });

      s.on("new-message", async (messageData: any) => {
        // Handle new message similar to realtime logic
        const newMsg: Message = {
          id: messageData.id,
          text: messageData.message || "",
          sender: messageData.sender_type,
          timestamp: messageData.timestamp ? new Date(messageData.timestamp).toISOString() : new Date().toISOString(),
          rawTimestamp: new Date(messageData.timestamp).getTime(),
          isRead: messageData.sender_type === "agent",
          media_type: messageData.media_type || "none",
          media_url: messageData.media_url || null,
          caption: messageData.caption || null,
        };

        // If inbound and selected conversation, mark as read
        if (
          messageData.sender_type === "customer" &&
          selectedConversationIdRef.current === messageData.customer_id
        ) {
          // For real-time updates, we mark as read in the UI
          newMsg.isRead = true;

          // Mark all unread messages for this customer as read in the backend
          try {
            const token = getToken();
            if (token) {
              fetch(
                `${import.meta.env.VITE_BACKEND_URL}/conversations/${
                  messageData.customer_id
                }/mark-read?agentId=${agentId}`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              ).catch((error) => {
                console.error("Failed to mark messages as read:", error);
              });
            }
          } catch (error) {
            console.error("Failed to mark messages as read:", error);
          }
        }

        setConversations((prev) => {
          // Find or create conversation
          const existingConvIndex = prev.findIndex(
            (c) => c.customerId === messageData.customer_id
          );

          if (existingConvIndex !== -1) {
            // Update existing conversation
            const existingConv = prev[existingConvIndex];
            let updatedMessages = [...existingConv.messages];

            // Add rawTimestamp to the new message for proper sorting
            newMsg.rawTimestamp = new Date(messageData.timestamp).getTime();

            // Check for optimistic temp message to replace
            let tempIndex = -1;
            for (let i = updatedMessages.length - 1; i >= 0; i--) {
              const msg = updatedMessages[i];
              if (
                typeof msg.id === "string" &&
                (msg.id.startsWith("temp-") ||
                  msg.id.startsWith("temp-template-")) &&
                msg.sender === newMsg.sender &&
                msg.text === newMsg.text
              ) {
                tempIndex = i;
                break;
              }
            }

            if (tempIndex !== -1) {
              // Replace temp with real message
              updatedMessages[tempIndex] = newMsg;
            } else {
              // Add new message
              updatedMessages.push(newMsg);
            }

            // Sort messages by rawTimestamp
            updatedMessages.sort((a, b) => {
              const aTime = a.rawTimestamp || new Date(a.timestamp).getTime();
              const bTime = b.rawTimestamp || new Date(b.timestamp).getTime();
              return aTime - bTime;
            });

            const unreadCount = updatedMessages.filter(
              (m) => m.sender === "customer" && !m.isRead
            ).length;

            const lastMsg = updatedMessages[updatedMessages.length - 1];
            const lastMessageText = processMessageText(
              messageData.message,
              messageData.media_type,
              messageData.caption
            );
            const updatedConv = {
              ...existingConv,
              messages: updatedMessages,
              lastMessage: lastMessageText,
              lastMessageTime: lastMsg.timestamp,
              rawLastTimestamp: new Date(messageData.timestamp).getTime(),
              unreadCount,
            };

            // Update the conversation in the array
            const newConversations = [...prev];
            newConversations[existingConvIndex] = updatedConv;

            // Sort conversations by last message time
            return newConversations.sort(
              (a, b) => b.rawLastTimestamp - a.rawLastTimestamp
            );
          } else {
            // Create new conversation - fetch customer
            const newConv: Conversation = {
              id: messageData.customer_id,
              customerId: messageData.customer_id,
              customerName:
                messageData.customer_name || `Customer ${messageData.customer_id}`,
              customerPhone: messageData.customer_phone || "",
              lastUserMessageTime: null,
              aiEnabled: false,
              leadStage: null,
              interestStage: null,
              conversionStage: null,
              lastMessage: processMessageText(
                messageData.message,
                messageData.media_type,
                messageData.caption
              ),
              lastMessageTime: newMsg.timestamp,
              rawLastTimestamp: new Date(messageData.timestamp).getTime(),
              unreadCount: newMsg.isRead ? 0 : 1,
              messages: [newMsg],
            };

            return [newConv, ...prev].sort(
              (a, b) => b.rawLastTimestamp - a.rawLastTimestamp
            );
          }
        });

        // Dispatch event for navbar update if message is unread
        if (messageData.sender_type === "customer" && !newMsg.isRead) {
          window.dispatchEvent(
            new CustomEvent("unread-message-received", {
              detail: {
                count: 1,
                messageData: {
                  id: newMsg.id,
                  customer_id: messageData.customer_id,
                  message: newMsg.text,
                  timestamp: newMsg.timestamp,
                  customerName:
                    messageData.customer_name ||
                    `Customer ${messageData.customer_id}`,
                  customerPhone: messageData.customer_phone || "",
                },
              },
            })
          );
        }

        setLastRealtimeEvent(Date.now());

        // Scroll to bottom if message is for selected conversation
        if (
          selectedConversationIdRef.current === messageData.customer_id &&
          messagesContainerRef.current
        ) {
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
            }
          }, 100);
        }
      });

      s.on("agent-status-update", (statusData: any) => {
        // Handle agent status updates (e.g., credits changed)
        // For now, just log - can be extended to update UI
      });

      s.on("disconnect", () => {
      });

      return s;
    };

    activeSocket = initSocket(socketUrl, socketPath);
    setSocket(activeSocket);

    return () => {
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, [
    agentId,
    processMessageText,
  ]);

  // Socket.IO state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [customerIds, setCustomerIds] = useState<number[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const handleConversationsSearch = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchConversations(e.target.value);
  };

  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (activeTab === "unread") {
      result = result.filter((c) => c.unreadCount > 0);
    } else if (activeTab === "ai") {
      result = result.filter((c) => c.aiEnabled);
    } else if (activeTab === "orders") {
      result = result.filter((c) => c.conversionStage === "Order Confirmed");
    }

    if (stageFilter) {
      result = result.filter(
        (c) =>
          c.leadStage === stageFilter ||
          c.interestStage === stageFilter ||
          c.conversionStage === stageFilter
      );
    }

    if (timeFilter) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 86400000;
      const startOfWeek = startOfToday - now.getDay() * 86400000;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      result = result.filter((c) => {
        const ts = c.rawLastTimestamp;
        if (timeFilter === "today") return ts >= startOfToday;
        if (timeFilter === "yesterday") return ts >= startOfYesterday && ts < startOfToday;
        if (timeFilter === "week") return ts >= startOfWeek;
        if (timeFilter === "month") return ts >= startOfMonth;
        return true;
      });
    }

    const searchTerm = searchConversations.toLowerCase().trim();
    if (searchTerm) {
      result = result.filter(
        (c) =>
          c.customerName.toLowerCase().includes(searchTerm) ||
          c.customerPhone.includes(searchTerm) ||
          c.lastMessage.toLowerCase().includes(searchTerm)
      );
    }

    return result;
  }, [conversations, searchConversations, activeTab, stageFilter, timeFilter]);

  const handleNewConversation = () => {
    setShowNewConversationModal(true);
  };

  const fetchCustomers = useCallback(async () => {
    if (!agentId) return;

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      setCustomers(data.success ? data.customers : []);
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentPrefix && agentId) {
      fetchCustomers();
    }
  }, [fetchCustomers]);

  const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchCustomer(e.target.value);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      customer.phone.includes(searchCustomer)
  );

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !customerForm.name.trim() || !customerForm.phone.trim())
      return;

    const fullPhone =
      `${selectedConversationCountryCode}${customerForm.phone}`.replace(
        "+",
        ""
      );
    setCreatingCustomer(true);
    try {
      const token = getToken();
      if (!token) {
        setCreatingCustomer(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: customerForm.name.trim(),
            phone: fullPhone,
            ai_enabled: false,
          }),
        }
      );

      if (!response.ok) {
        setCreatingCustomer(false);
        return;
      }

      const data = await response.json();
      if (data.success && data.customer) {
        setCustomers((prev) => [data.customer, ...prev]);
        setCustomerForm({ name: "", phone: "" });
        setSelectedConversationCountryCode("+94");
        setCreatingCustomer(false);

        // Start conversation with new customer
        startConversationWithCustomer(
          data.customer.id,
          data.customer.name,
          fullPhone,
          data.customer.last_user_message_time
        );
      } else {
        setCreatingCustomer(false);
      }
    } catch (err) {
      console.error("Error creating customer:", err);
      setCreatingCustomer(false);
    }
  };

  const startConversationWithCustomer = (
    customerId: number,
    customerName: string,
    customerPhone: string,
    lastUserMessageTime?: string | null
  ) => {
    // Create or find conversation
    const newConversation: Conversation = {
      id: customerId,
      customerId: customerId,
      customerName: customerName,
      customerPhone: customerPhone,
      lastUserMessageTime: lastUserMessageTime || null,
      aiEnabled: false,
      lastMessage: "New conversation started",
      lastMessageTime: new Date().toISOString(),
      rawLastTimestamp: Date.now(),
      unreadCount: 0,
      messages: [],
    };

    setConversations((prev) => {
      const exists = prev.find((conv) => conv.customerId === customerId);
      if (exists) {
        const updated = prev.map((conv) =>
          conv.customerId === customerId
            ? { ...newConversation, rawLastTimestamp: Date.now() }
            : conv
        );
        return updated;
      }
      const updated = [
        { ...newConversation, rawLastTimestamp: Date.now() },
        ...prev,
      ];
      return updated;
    });

    setSelectedConversationId(customerId);
    setShowNewConversationModal(false);
  };

  const handleSelectCustomer = (customer: Customer) => {
    // Check if conversation already exists
    const existingConv = conversations.find(
      (conv) => conv.customerId === customer.id
    );
    if (existingConv) {
      // Just select the existing conversation
      setSelectedConversationId(existingConv.id);
    } else {
      // Create new empty conversation for customer without existing messages
      startConversationWithCustomer(
        customer.id,
        customer.name,
        customer.phone,
        customer.last_user_message_time
      );
    }
    setShowNewConversationModal(false);
  };

  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerForm({
      ...customerForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleCustomerPhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, "");
    setCustomerForm({
      ...customerForm,
      [e.target.name]: value,
    });
  };

  const handleCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "name") {
      handleCustomerNameChange(e);
    } else if (e.target.name === "phone") {
      handleCustomerPhoneChange(e);
    }
  };

  const handleConversationCountryChange = (code: string) => {
    setSelectedConversationCountryCode(code);
    if (customerForm.phone.startsWith(code.replace("+", ""))) {
      return;
    }
    setCustomerForm({ ...customerForm, phone: "" });
  };

  // Derive selected conversation from conversations state
  const selectedConversation = useMemo(
    () =>
      conversations.find((conv) => conv.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  // Clear pending media and reset pagination when switching conversations
  useEffect(() => {
    setPendingMedia([]);
    setMessageOffset((prev) => ({ ...prev, [selectedConversationId || 0]: 0 }));
    setHasMoreMessages((prev) => ({
      ...prev,
      [selectedConversationId || 0]: true,
    }));
  }, [selectedConversationId]);

  // Function to fetch only the selected conversation's messages
  const fetchSelectedConversation = useCallback(
    async (loadMore = false) => {
      if (!selectedConversationId || !agentId) return;

      if (!loadMore) {
        const existingConv = conversations.find(
          (c) => c.id === selectedConversationId
        );
        const hasExistingMessages = existingConv && existingConv.messages && existingConv.messages.length > 0;
        if (!hasExistingMessages) {
          setLoadingMessages(true);
        }
      }

      try {
        // Get authenticated session
        const token = getToken();
        if (!token) return;

        const currentOffset = messageOffset[selectedConversationId] || 0;
        const limit = 50;
        const offset = loadMore ? currentOffset : 0;

        // Get messages using backend API
        const messagesResponse = await fetch(
          `${
            import.meta.env.VITE_BACKEND_URL
          }/conversations/${selectedConversationId}/messages?agentId=${agentId}&limit=${limit}&offset=${offset}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!messagesResponse.ok) return;

        const processedMessages: Message[] = await messagesResponse.json();

        // Update offset and hasMore state
        const newOffset = offset + processedMessages.length;
        setMessageOffset((prev) => ({
          ...prev,
          [selectedConversationId]: newOffset,
        }));
        setHasMoreMessages((prev) => ({
          ...prev,
          [selectedConversationId]: processedMessages.length === limit,
        }));

        // Get existing conversation
        const existingConv = conversations.find(
          (c) => c.id === selectedConversationId
        );
        if (!existingConv) return;

        let updatedMessages: Message[];
        if (loadMore) {
          // Prepend older messages to existing ones
          updatedMessages = [...processedMessages, ...existingConv.messages];
          setMessagesWerePrepended(true);
          setMessagesPrependedCount(processedMessages.length);
          setLastRealtimeEvent(Date.now()); // Prevent polling from overriding
        } else {
          // Merge with existing messages to preserve real-time updates
          const existingMessages = existingConv.messages || [];
          const allMessages = [...processedMessages, ...existingMessages];

          // Remove duplicates based on id and keep the most recent version
          const messageMap = new Map<string | number, Message>();
          allMessages.forEach((msg) => {
            const existing = messageMap.get(msg.id);
            if (
              !existing ||
              (msg.rawTimestamp || 0) > (existing.rawTimestamp || 0)
            ) {
              messageMap.set(msg.id, msg);
            }
          });

          updatedMessages = Array.from(messageMap.values()).sort((a, b) => {
            const aTime = a.rawTimestamp || new Date(a.timestamp).getTime();
            const bTime = b.rawTimestamp || new Date(b.timestamp).getTime();
            return aTime - bTime;
          });

          setMessagesWerePrepended(false);
          setMessagesPrependedCount(0);
        }

        const unreadCount = updatedMessages.filter(
          (m) => m.sender === "customer" && !m.isRead
        ).length;

        const lastMsg = updatedMessages[updatedMessages.length - 1];
        const lastMessageText = lastMsg
          ? processMessageText(
              lastMsg.text,
              lastMsg.media_type || null,
              lastMsg.caption || null
            )
          : "No messages yet";
        const lastMessageTime = lastMsg
          ? lastMsg.timestamp
          : new Date().toISOString();
        const rawLastTimestamp = lastMsg ? lastMsg.rawTimestamp : Date.now();

        const updatedConv = {
          ...existingConv,
          lastMessage: lastMessageText,
          lastMessageTime: lastMessageTime,
          rawLastTimestamp: rawLastTimestamp ?? Date.now(),
          unreadCount,
          messages: updatedMessages,
        } as Conversation;

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversationId ? updatedConv : conv
          )
        );

        // Scroll to bottom only for initial load
        if (!loadMore && messagesContainerRef.current) {
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error fetching selected conversation:", error);
      } finally {
        if (!loadMore) {
          setLoadingMessages(false);
        }
      }
    },
    [
      selectedConversationId,
      agentId,
      conversations,
      processMessageText,
      messageOffset,
    ]
  );

  // Extracted fetch function to make it reusable
  const fetchAgentAndConversations = useCallback(
    async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setLoading(true);
          setError(null);
        }

        // Get token for API calls
        const token = getToken();
        if (!token) {
          setError("User not authenticated");
          if (isInitialLoad) setLoading(false);
          return;
        }

        let currentAgentId = agentId;

        // If it's initial load or agentId is not set, we fetch profile first
        if (isInitialLoad || !currentAgentId) {
          // Get authenticated user
          const userResult = await getUser();
          if (userResult.error || !userResult.data.user) {
            setError("User not authenticated");
            if (isInitialLoad) setLoading(false);
            return;
          }

          const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            setError("Failed to fetch agent profile");
            if (isInitialLoad) setLoading(false);
            return;
          }

          const agentProfile = await response.json();
          if (!agentProfile.success || !agentProfile.agent) {
            setError("Agent not found");
            if (isInitialLoad) setLoading(false);
            return;
          }

          const agentData = agentProfile.agent;
          currentAgentId = agentData.id;
          setAgentId(agentData.id);
          setAgentPrefix(agentData.agent_prefix);
          setBusinessType(agentData.business_type);
          setAgentName(agentData.name || null);
        }

        // Get conversations using backend API
        const conversationsResponse = await fetch(
          `${
            import.meta.env.VITE_BACKEND_URL
          }/conversations?agentId=${currentAgentId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!conversationsResponse.ok) {
          setError("Failed to fetch conversations");
          if (isInitialLoad) setLoading(false);
          return;
        }

        const conversationsData = await conversationsResponse.json();
        const conversationsList = conversationsData || [];

        // Check if selected conversation has new messages in database
        if (selectedConversationIdRef.current) {
          const fetchedSelected = conversationsList.find((c: any) => c.id === selectedConversationIdRef.current);
          const currentSelected = conversationsRef.current.find((c) => c.id === selectedConversationIdRef.current);
          if (fetchedSelected && (!currentSelected || fetchedSelected.rawLastTimestamp > currentSelected.rawLastTimestamp)) {
            // Trigger fetch selected conversation's messages
            fetchSelectedConversation();
          }
        }

        // Preserve unread count of 0 for selected conversation to avoid race conditions
        setConversations((prev) => {
          const updatedConversations = conversationsList.map((newConv: any) => {
            const existingConv = prev.find((c) => c.id === newConv.id);
            
            let mergedConv = { ...newConv, messages: existingConv?.messages || [] };
            
            // If the local conversation has a newer message (e.g. from an optimistic update or a real-time event),
            // preserve the newer message info to prevent flickering/blinking.
            if (existingConv && existingConv.rawLastTimestamp > newConv.rawLastTimestamp) {
              mergedConv = {
                ...mergedConv,
                lastMessage: existingConv.lastMessage,
                lastMessageTime: existingConv.lastMessageTime,
                rawLastTimestamp: existingConv.rawLastTimestamp,
                unreadCount: existingConv.unreadCount,
              };
            }

            // If this conversation is currently selected and has unreadCount 0, preserve it
            if (
              existingConv &&
              selectedConversationId === newConv.id &&
              existingConv.unreadCount === 0
            ) {
              mergedConv.unreadCount = 0;
            }

            return mergedConv;
          });

          const finalConversations = updatedConversations.sort(
            (a: any, b: any) => b.rawLastTimestamp - a.rawLastTimestamp
          );

          return finalConversations;
        });
      } catch (err: any) {
        setError("Failed to load conversations");
      } finally {
        if (isInitialLoad) setLoading(false);
      }
    },
    [agentId, selectedConversationId, fetchSelectedConversation]
  );

  // Function to load more messages when scrolling up
  const loadMoreMessages = useCallback(async () => {
    if (
      !selectedConversationId ||
      loadingMoreMessages ||
      !hasMoreMessages[selectedConversationId]
    )
      return;

    setLoadingMoreMessages(true);
    try {
      await fetchSelectedConversation(true);
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [
    selectedConversationId,
    loadingMoreMessages,
    hasMoreMessages,
    fetchSelectedConversation,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchAgentAndConversations(true);
  }, []);

  // Set container height to fit viewport minus navbar
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const navbarHeight = 60; // Adjust based on actual navbar height
        containerRef.current.style.height = `${
          window.innerHeight - navbarHeight
        }px`;
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const selectConversation = useCallback(
    async (conversation: Conversation) => {
      const unreadToMark = conversation.unreadCount;
      const customerId = conversation.customerId;

      setSelectedConversationId(conversation.id);

      // Immediately update UI to show 0 unread count and mark messages as read for better UX
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id
            ? {
                ...conv,
                unreadCount: 0,
                messages: conv.messages.map((msg) =>
                  msg.sender === "customer" && !msg.isRead
                    ? { ...msg, isRead: true }
                    : msg
                ),
              }
            : conv
        )
      );

      // Mark messages as read
      if (unreadToMark > 0) {
        try {
          const token = getToken();
          if (token) {
            const response = await fetch(
              `${
                import.meta.env.VITE_BACKEND_URL
              }/conversations/${customerId}/mark-read?agentId=${agentId}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (response.ok) {
              const data = await response.json();
            } else {
              const errorText = await response.text();
              console.error(
                "Failed to mark messages as read:",
                response.status,
                errorText
              );
            }
          } else {
          }
        } catch (error) {
          console.error("Failed to mark messages as read:", error);
        }

        // Update the conversation unread count directly since we know it should be 0
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
          )
        );

        // Dispatch custom event for immediate header update
        window.dispatchEvent(
          new CustomEvent("unread-messages-read", {
            detail: { customerId, count: unreadToMark },
          })
        );
      }

      // Fetch messages after marking as read
      await fetchSelectedConversation();
    },
    [agentPrefix, agentId, fetchSelectedConversation]
  );

  useEffect(() => {
    const customerIdParam = searchParams.get("customerId");
    if (customerIdParam && conversations.length > 0) {
      const id = Number(customerIdParam);
      const conv = conversations.find((c) => c.customerId === id);
      if (conv && conv.id !== selectedConversationId) {
        selectConversation(conv);
        // Clear the search param after selecting
        navigate("/agent/conversations");
      }
    }
  }, [
    searchParams,
    conversations,
    selectedConversationId,
    selectConversation,
    navigate,
  ]);

  // Ensure messages are loaded when conversation is selected but has no messages
  useEffect(() => {
    if (
      selectedConversationId &&
      selectedConversation &&
      (!selectedConversation.messages ||
        selectedConversation.messages.length === 0)
    ) {
      fetchSelectedConversation();
    }
  }, [selectedConversationId, selectedConversation, fetchSelectedConversation]);

  // True realtime updates via 1-second polling

  // Fallback polling for realtime drops - selected conversation
  // Disabled to prevent overriding prepended messages
  /*
  useEffect(() => {
    if (!selectedConversationId || !agentPrefix || !agentId) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const quietThreshold = 10000; // 10s without realtime
    const pollInterval = 1000; // Poll every 1s if quiet

    const checkAndPoll = () => {
      const timeSinceLastEvent = Date.now() - lastRealtimeEvent;
      if (timeSinceLastEvent > quietThreshold) {
        fetchSelectedConversation();
      }
    };

    pollIntervalRef.current = setInterval(checkAndPoll, pollInterval);

    // Initial check
    checkAndPoll();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [
    selectedConversationId,
    agentPrefix,
    agentId,
    lastRealtimeEvent,
    fetchSelectedConversation,
  ]);
  */

  // Polling for conversation list updates (fallback for non-selected conversations)
  useEffect(() => {
    if (!agentPrefix || !agentId) return;

    const listPollInterval = setInterval(() => {
      fetchAgentAndConversations(false);
    }, 3000); // Poll full list every 3 seconds to ensure updates

    return () => clearInterval(listPollInterval);
  }, [agentPrefix, agentId, fetchAgentAndConversations]);

  const compressImage = (
    file: File,
    maxWidth: number = 1200,
    maxHeight: number = 1200
  ): Promise<{ whatsappFile: File; storageFile: File }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      reader.onerror = (error) => {
        console.error("FileReader error", error);
        reject(error);
      };
      reader.readAsDataURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        const whatsappOutputType = "image/jpeg";
        const storageOutputType = "image/jpeg";

        const createFile = (
          outputType: string,
          quality: number | undefined,
          nameSuffix: string
        ): Promise<File> => {
          return new Promise((resolveFile, rejectFile) => {
            const options: any = { type: outputType };
            if (quality !== undefined && outputType === "image/jpeg") {
              options.quality = quality;
            }
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  let finalName = file.name;
                  if (
                    outputType === "image/jpeg" &&
                    file.type === "image/png"
                  ) {
                    finalName = file.name.replace(/\.png$/i, ".jpg");
                  }
                  finalName = finalName.replace(
                    /(\.[^.]+)$/,
                    `_${nameSuffix}$1`
                  );
                  const compressedFile = new File([blob], finalName, {
                    type: outputType,
                  });
                  resolveFile(compressedFile);
                } else {
                  rejectFile(new Error("Failed to compress image"));
                }
              },
              options.type,
              options.quality
            );
          });
        };

        // Create files below 1MB limit
        const compressToLimit = (
          initialQuality: number,
          nameSuffix: string
        ): Promise<File> => {
          const tryCompress = (q: number): Promise<File> => {
            return createFile("image/jpeg", q, nameSuffix).then((compressedFile) => {
              if (compressedFile.size > 0.95 * 1024 * 1024 && q > 0.1) {
                // If the file is still larger than 950KB and we can reduce quality, try again
                return tryCompress(q - 0.05);
              }
              return compressedFile;
            });
          };
          return tryCompress(initialQuality);
        };

        compressToLimit(0.8, "storage")
          .then((storageFile) => {
            compressToLimit(0.8, "whatsapp")
              .then((whatsappFile) => {
                resolve({ whatsappFile, storageFile });
              })
              .catch(reject);
          })
          .catch(reject);
      };

      img.onerror = reject;
    });
  };

  const handleSendVoiceMessage = async (file: File) => {
    if (!selectedConversationId || !selectedConversation) {
      setSendError("No conversation selected");
      return;
    }

    setUploading(true);
    setSendError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Normalization of audio types for Meta Graph API compatibility
      let normalizedType = file.type;
      if (file.type === "audio/mp3") normalizedType = "audio/mpeg";
      else if (file.type === "audio/x-m4a" || file.type === "audio/m4a") normalizedType = "audio/mp4";

      const normalizedFile = new File([file], file.name, { type: normalizedType });

      const formData = new FormData();
      formData.append("purpose", "whatsapp");
      formData.append("file", normalizedFile);

      const uploadResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/upload-media`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadResult?.success) {
        throw new Error(uploadResult?.error || "Failed to upload voice message");
      }

      const media = uploadResult.media?.[0];
      if (!media) {
        throw new Error("No media uploaded");
      }

      // Window check (24 hour)
      if (selectedConversation.lastUserMessageTime) {
        const lastTime = new Date(selectedConversation.lastUserMessageTime);
        const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
        if (hoursSince > 24) {
          throw new Error("Template required after 24h window (cannot send voice notes)");
        }
      }

      const formattedPhone = selectedConversation.customerPhone.replace(/[\s+]/g, "");

      // Optimistic UI update
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempId,
        text: "[Voice Message]",
        sender: "agent" as const,
        timestamp: new Date().toISOString(),
        rawTimestamp: Date.now(),
        isRead: true,
        media_type: "audio" as const,
        media_url: media.media_download_url,
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversationId
            ? {
                ...conv,
                messages: [...conv.messages, optimisticMsg],
                lastMessage: "[Voice Message]",
                lastMessageTime: "Just now",
                rawLastTimestamp: Date.now(),
              }
            : conv
        )
      );

      setSending(true);

      const userResult = await getUser();
      if (userResult.error || !userResult.data.user) {
        throw new Error("User not authenticated");
      }
      const user = userResult.data.user;

      const sendResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/send-whatsapp-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            customer_phone: formattedPhone,
            type: "audio",
            category: "utility",
            media_ids: [media.media_id],
            voice: true,
          }),
        }
      );

      const sendResult = await sendResponse.json();
      if (!sendResponse.ok || !sendResult?.success) {
        // Revert optimistic message
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter((m) => m.id !== tempId),
                }
              : conv
          )
        );
        throw new Error(sendResult?.error || "Failed to send voice message");
      }

      // Sync and refetch
      await fetchAgentAndConversations(false);
    } catch (err: any) {
      setSendError(`Failed to send voice message: ${err.message}`);
    } finally {
      setUploading(false);
      setSending(false);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (!selectedConversationId || !selectedConversation) {
      setSendError("No conversation selected");
      return;
    }

    if (files.length === 0) return;

    // Client-side validation matching backend limits
    const allowedMediaTypes: Record<string, number> = {
      // Images: 5 MB
      "image/jpeg": 5 * 1024 * 1024,
      "image/png": 5 * 1024 * 1024,
      // Stickers (WebP): 500 KB
      "image/webp": 500 * 1024,
      // Documents: 100 MB
      "text/plain": 100 * 1024 * 1024,
      "application/pdf": 100 * 1024 * 1024,
      "application/msword": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        100 * 1024 * 1024,
      "application/vnd.ms-excel": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        100 * 1024 * 1024,
      "application/vnd.ms-powerpoint": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        100 * 1024 * 1024,
      // Audio: 16 MB
      "audio/aac": 16 * 1024 * 1024,
      "audio/amr": 16 * 1024 * 1024,
      "audio/mpeg": 16 * 1024 * 1024,
      "audio/mp3": 16 * 1024 * 1024,
      "audio/mp4": 16 * 1024 * 1024,
      "audio/m4a": 16 * 1024 * 1024,
      "audio/x-m4a": 16 * 1024 * 1024,
      "audio/ogg": 16 * 1024 * 1024,
      "audio/wav": 16 * 1024 * 1024,
      "audio/x-wav": 16 * 1024 * 1024,
      "audio/webm": 16 * 1024 * 1024,
      // Video: 16 MB
      "video/3gpp": 16 * 1024 * 1024,
      "video/mp4": 16 * 1024 * 1024,
    };

    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      const maxForType =
        allowedMediaTypes[file.type as keyof typeof allowedMediaTypes];
      if (maxForType === undefined) {
        invalidFiles.push(`Unsupported file type: ${file.name} (${file.type})`);
      } else if (file.size > maxForType) {
        const limitMB = (maxForType / (1024 * 1024)).toFixed(1);
        invalidFiles.push(
          `File too large: ${file.name} (${(file.size / (1024 * 1024)).toFixed(
            1
          )}MB) exceeds ${limitMB}MB limit for ${file.type}`
        );
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setSendError(invalidFiles.join("\n"));
      return;
    }

    if (validFiles.length === 0) {
      setSendError("No valid files to upload");
      return;
    }

    setUploading(true);
    setSendError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      const appendPromises = validFiles.map(async (file) => {
        if (file.type.startsWith("image/")) {
          // Add timeout to compression to prevent hanging
          const compressionTimeout = 30000; // 30 seconds timeout for compression
          const compressionPromise = compressImage(file);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("Image compression timeout")),
              compressionTimeout
            );
          });

          try {
            const { whatsappFile, storageFile } = (await Promise.race([
              compressionPromise,
              timeoutPromise,
            ])) as any;
            formData.append("purpose", "whatsapp");
            formData.append("file", whatsappFile);
            formData.append("purpose", "storage");
            formData.append("file", storageFile);
          } catch (compressionError: any) {
            throw new Error(
              `Failed to compress image ${file.name}: ${compressionError.message}`
            );
          }
        } else if (file.type.startsWith("audio/")) {
          // Normalize audio MIME types for Meta compatibility
          let normalizedType = file.type;
          if (file.type === "audio/mp3") {
            normalizedType = "audio/mpeg";
          } else if (file.type === "audio/x-m4a" || file.type === "audio/m4a") {
            normalizedType = "audio/mp4";
          }
          const normalizedFile = new File([file], file.name, { type: normalizedType });
          formData.append("file", normalizedFile);
        } else {
          formData.append("file", file);
        }
      });
      await Promise.all(appendPromises);

      // Calculate timeout based on file sizes (allow ~30 seconds per MB)
      const totalSizeMB =
        validFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
      const timeoutMs = Math.max(60000, Math.min(totalSizeMB * 30000, 300000)); // Min 60s, max 5min

      // Use Promise.race for timeout instead of AbortController
      const uploadPromise = fetch(
        `${import.meta.env.VITE_BACKEND_URL}/upload-media`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Upload timeout")), timeoutMs);
      });

      const uploadResponse = (await Promise.race([
        uploadPromise,
        timeoutPromise,
      ])) as Response;
      const uploadResult = await uploadResponse.json();
      const uploadError = !uploadResponse.ok
        ? { message: uploadResult.error }
        : null;

      let errMsg;
      if (uploadError) {
        errMsg = uploadError.message || "Failed to upload media";
      } else {
        errMsg = uploadResult?.error || "Failed to upload media";
      }

      if (uploadError || !uploadResult?.success) {
        throw new Error(errMsg);
      }

      const media = uploadResult.media || [];
      if (media.length === 0) {
        throw new Error("No media uploaded");
      }

      if (uploadResult.errors?.length > 0) {
        const errorDetails = uploadResult.errors
          .map((e: any) => e.error)
          .join("; ");
        throw new Error(`Some uploads failed: ${errorDetails}`);
      }

      setPendingMedia(
        media.map((item: any) => ({
          id: item.media_id, // WhatsApp media ID for sending
          url: item.media_download_url, // R2 URL for dashboard display
          media_type: item.media_type,
          filename: item.filename,
        }))
      );

      // Clear any previous error
      setSendError(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      if (error.message === "Upload timeout") {
        setSendError(
          "Upload timed out. Please try with a smaller file or check your connection."
        );
      } else {
        setSendError(`Failed to upload media: ${error.message}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    // Check for special command to re-send product with full details and images
    if (
      newMessage.trim() === "Make this in properway and send again with images"
    ) {
      if (!selectedConversationId) {
        setSendError("No conversation selected");
        return;
      }

      const lastProduct = lastSentProducts[selectedConversationId];
      if (!lastProduct) {
        setSendError("No recent product found to re-send with full details");
        return;
      }

      const conversation = conversations.find(
        (conv) => conv.id === selectedConversationId
      );
      if (!conversation) {
        setSendError("Conversation not found");
        return;
      }

      // Check 24h window
      if (conversation.lastUserMessageTime) {
        const lastTime = new Date(conversation.lastUserMessageTime);
        const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
        if (hoursSince > 24) {
          setTemplateError("Template required after 24h window");
          setShowTemplateModal(true);
          return;
        }
      }

      setSending(true);
      setSendError(null);
      setNewMessage(""); // Clear the input

      try {
        const userResult = await getUser();
        if (userResult.error || !userResult.data.user)
          throw new Error("Not authenticated");
        const user = userResult.data.user;

        const formattedPhone = conversation.customerPhone.replace(/[\s+]/g, "");

        // Send full product message with description
        let fullProductMessage = `*${lastProduct.name}*\n\n`;
        if (lastProduct.description) {
          fullProductMessage += `${lastProduct.description}\n\n`;
        }
        if (lastProduct.price) {
          fullProductMessage += `Price: $${lastProduct.price.toFixed(2)}\n`;
        }
        fullProductMessage += "Interested? Reply with your order!";

        const textPayload = {
          user_id: user.id,
          customer_phone: formattedPhone,
          message: fullProductMessage,
          type: "text",
          category: "utility",
        };

        const token = getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const textResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/send-whatsapp-message`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(textPayload),
          }
        );
        const textData = await textResponse.json();
        const textError = !textResponse.ok ? { message: textData.error } : null;

        if (textError || !textData?.success) {
          throw new Error(
            textData?.error ||
              textError?.message ||
              "Failed to send full product details"
          );
        }

        // Send images if any
        if (lastProduct.images && lastProduct.images.length > 0) {
          for (const imageUrl of lastProduct.images) {
            const imagePayload = {
              ...textPayload,
              type: "image",
              media_url: imageUrl,
              caption: "Product image",
            };
            const imgResponse = await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/send-whatsapp-message`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(imagePayload),
              }
            );
            const imgData = await imgResponse.json();
            if (!imgResponse.ok || !imgData?.success) {
              console.error("Failed to send product image", imgData);
            }
          }
        }

        // Refresh conversation
        await fetchSelectedConversation();
      } catch (err: any) {
        setSendError(`Failed to re-send full product: ${err.message}`);
      } finally {
        setSending(false);
      }

      return;
    }

    // Check if we have pending media to send
    if (pendingMedia.length > 0) {
      const conversation = conversations.find(
        (conv) => conv.id === selectedConversationId
      );
      if (!conversation) {
        setSendError("Conversation not found");
        return;
      }

      // Client-side window check
      if (conversation.lastUserMessageTime) {
        const lastTime = new Date(conversation.lastUserMessageTime);
        const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
        if (hoursSince > 24) {
          const errorMsg = "Template required for media after 24h window";
          setTemplateError(errorMsg);
          setShowTemplateModal(true);
          return;
        }
      }

      const customerPhone = conversation.customerPhone;
      const caption = newMessage.trim();

      // Determine media type from first item (since non-images are single, images multiple)
      const mediaType = pendingMedia[0].media_type;

      // Create optimistic UI update
      const baseTimestamp = Date.now();
      const optimisticMsgs: Message[] = pendingMedia.map((media, i) => ({
        id: `temp-${baseTimestamp + i}`,
        text: caption || `[${mediaType.toUpperCase()}]`,
        sender: "agent" as const,
        timestamp: new Date(baseTimestamp + i * 100).toISOString(),
        rawTimestamp: baseTimestamp + i * 100,
        isRead: true,
        media_type: media.media_type as
          | "image"
          | "video"
          | "audio"
          | "document",
        media_url: media.url,
        caption: caption || null,
      }));

      // Update UI immediately
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversationId
            ? {
                ...conv,
                messages: [...conv.messages, ...optimisticMsgs],
                lastMessage:
                  caption || `[${pendingMedia.length} ${mediaType}s]`,
                lastMessageTime: "Just now",
                rawLastTimestamp: baseTimestamp,
              }
            : conv
        )
      );

      const tempIds = optimisticMsgs.map((m) => m.id);
      setLastSentMessageId(tempIds.map((id) => String(id)));

      setSending(true);
      setSendError(null);

      try {
        const userResult = await getUser();
        if (userResult.error || !userResult.data.user) {
          throw new Error("User not authenticated");
        }
        const user = userResult.data.user;

        const formattedPhone = customerPhone.replace(/[\s+]/g, "");

        const payload = {
          user_id: user.id,
          customer_phone: formattedPhone,
          type: mediaType,
          category: "utility",
          caption: caption,
          media_ids: pendingMedia.map((m) => m.id),
        };

        const token = getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/send-whatsapp-message`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json();
        const error = !response.ok
          ? { message: data.error || "Failed to send template" }
          : null;

        if (error || !data?.success) {
          const errorMsg =
            data?.error || error?.message || "Failed to send media";
          if (errorMsg.includes("Template required after 24h window")) {
            if (agentId) {
              try {
                const token = getToken();
                if (token) {
                  const response = await fetch(
                    `${
                      import.meta.env.VITE_BACKEND_URL
                    }/manage-templates?is_active=true`,
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                      const filteredTemplates = data.templates.filter(
                        (t: any) =>
                          t.category === "utility" &&
                          t.name !== "invoice_template"
                      );
                      setTemplates(filteredTemplates);
                    }
                  }
                }
              } catch (error) {
                console.error("Error fetching templates:", error);
              }
            }
            setTemplateError(errorMsg);
            setShowTemplateModal(true);
          } else {
            throw new Error(errorMsg);
          }
        }

        // On success, remove optimistic messages to let realtime add real ones
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter(
                    (msg) => !tempIds.includes(String(msg.id))
                  ),
                }
              : conv
          )
        );

        // Force refetch to ensure UI sync
        await fetchAgentAndConversations(false);
      } catch (err: any) {
        setSendError(`Failed to send media: ${err.message}`);

        // Revert optimistic update on error
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter(
                    (msg) => !tempIds.includes(String(msg.id))
                  ),
                }
              : conv
          )
        );
      } finally {
        setSending(false);
        setLastSentMessageId(null);
        setPendingMedia([]);
        setNewMessage("");
      }

      return;
    }

    // Regular text message
    if (newMessage.trim() && selectedConversationId !== null && !sending) {
      const conversation = conversations.find(
        (conv) => conv.id === selectedConversationId
      );
      if (!conversation) {
        setSendError("Conversation not found");
        return;
      }

      // Client-side window check (same as sendMediaMessage)
      if (conversation.lastUserMessageTime) {
        const lastTime = new Date(conversation.lastUserMessageTime);
        const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
        if (hoursSince > 24) {
          const errorMsg = "Template required after 24h window";
          // Fetch templates for this agent
          if (agentId) {
            try {
              const token = getToken();
              if (token) {
                const response = await fetch(
                  `${
                    import.meta.env.VITE_BACKEND_URL
                  }/manage-templates?is_active=true`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                if (response.ok) {
                  const data = await response.json();
                  if (data.success) {
                    const filteredTemplates = data.templates.filter(
                      (t: any) =>
                        t.category === "utility" &&
                        t.name !== "invoice_template"
                    );
                    setTemplates(filteredTemplates);
                  }
                }
              }
            } catch (error) {
              console.error("Error fetching templates:", error);
            }
          }
          setTemplateError(errorMsg);
          setShowTemplateModal(true);
          return;
        }
      }

      const messageText = newMessage.trim();
      const customerPhone = conversation.customerPhone;

      // Create optimistic UI update first
      const tempMessageId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempMessageId,
        text: messageText,
        sender: "agent" as const,
        timestamp: new Date().toISOString(),
        rawTimestamp: Date.now(),
        isRead: true,
      };

      // Update UI immediately
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversationId
            ? {
                ...conv,
                messages: [...conv.messages, optimisticMsg],
                lastMessage: messageText,
                lastMessageTime: "Just now",
                rawLastTimestamp: optimisticMsg.rawTimestamp,
              }
            : conv
        )
      );

      const tempIds = [String(tempMessageId)];
      setLastSentMessageId(tempIds);
      setNewMessage("");

      setSending(true);
      setSendError(null);

      let result: any = null;
      try {
        // Get authenticated user
        const userResult = await getUser();
        if (userResult.error || !userResult.data.user) {
          throw new Error("User not authenticated");
        }
        const user = userResult.data.user;

        // Format phone number for WhatsApp API (remove + and spaces)
        const formattedToPhone = customerPhone.replace(/[\s+]/g, "");

        // Send message via Node backend
        const token = getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/send-whatsapp-message`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              user_id: user.id,
              customer_phone: formattedToPhone,
              message: messageText,
              type: "text",
              category: "utility",
            }),
          }
        );
        const data = await response.json();
        const error = !response.ok
          ? { message: data.error || "Failed to send message" }
          : null;

        if (error || !data?.success) {
          const errorMsg =
            data?.error || error?.message || "Failed to send message";
          if (errorMsg.includes("Template required after 24h window")) {
            // Fetch templates for this agent
            if (agentId) {
              try {
                const token = getToken();
                if (token) {
                  const response = await fetch(
                    `${
                      import.meta.env.VITE_BACKEND_URL
                    }/manage-templates?is_active=true`,
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                      const filteredTemplates = data.templates.filter(
                        (t: any) => t.category === "utility"
                      );
                      setTemplates(filteredTemplates);
                    }
                  }
                }
              } catch (error) {
                console.error("Error fetching templates:", error);
              }
            }
            setTemplateError(errorMsg);
            setShowTemplateModal(true);
          } else {
            throw new Error(errorMsg);
          }
        }

        result = data;
        // On success, remove optimistic message to let realtime add real one
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter(
                    (msg) => !tempIds.includes(String(msg.id))
                  ),
                }
              : conv
          )
        );
      } catch (err: any) {
        setSendError(`Failed to send message: ${err.message}`);

        // Revert optimistic update on error
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter(
                    (msg) => !tempIds.includes(String(msg.id))
                  ),
                }
              : conv
          )
        );
      } finally {
        setSending(false);
        setLastSentMessageId(null);
      }
    }
  };

  const totalUnread = conversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0
  );
  const activeConversations = conversations.length;
  const displayedConversations = filteredConversations.length;

  useEffect(() => {
    if (showTemplateModal) {
      fetchTemplatesForModal();
    }
  }, [showTemplateModal, agentPrefix, agentId]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const modifierKey = isMac ? e.metaKey : e.ctrlKey;
    if (e.key === "Enter" && !modifierKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === "Enter" && modifierKey) {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const value = newMessage;
      const newValue = value.substring(0, start) + "\n" + value.substring(end);
      setNewMessage(newValue);
      // Set cursor position after the newline
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        textarea.focus();
      }, 0);
    }
  };

  const handleClearPendingMedia = () => {
    setPendingMedia([]);
    setSendError(null);
  };

  const handleCloseTemplateModal = () => {
    setShowTemplateModal(false);
    setTemplateError(null);
    setSelectedTemplate(null);
    setTemplateParams([]);
    setParamInputs({});
    setTemplateMedia(null);
    setRequiresMediaHeader(false);
  };

  const handleViewTemplate = (template: any) => {
    // Transform template data to match WhatsAppTemplate interface expected by ViewTemplateModal
    const transformedTemplate = {
      id: template.name, // Use name as id
      name: template.name,
      language: template.language || "en",
      category: template.category || "utility",
      components: template.body?.components || [],
      body: template.body,
      mediaUrls: template.body?.media_urls || {},
      status: template.status || "APPROVED",
      created_time: template.created_at,
    };
    setSelectedViewTemplate(transformedTemplate);
    setShowViewModal(true);
  };

  const getMediaPreviewUrl = async (handle: string): Promise<string> => {
    try {
      const token = getToken();
      if (!token) return "";

      const userResult = await getUser();
      if (userResult.error || !userResult.data.user) return "";
      const user = userResult.data.user;

      const configResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${
          user.id
        }`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!configResponse.ok) return "";

      const configData = await configResponse.json();
      if (!configData.success || !configData.whatsapp_config) return "";

      const config =
        configData.whatsapp_config[0] || configData.whatsapp_config;

      // If handle is already a direct URL (e.g., sample from Meta), use it directly
      if (handle.startsWith("http")) {
        return handle;
      }

      const { api_key, phone_number_id } = config;
      const url = new URL(
        `https://graph.facebook.com/v20.0/${phone_number_id}/media/${handle}`
      );
      url.searchParams.append("access_token", api_key);
      const response = await fetch(url.toString(), {
        method: "GET",
      });
      if (!response.ok) {
        return "";
      }
      const data = await response.json();
      return data.url || "";
    } catch (err) {
      return "";
    }
  };

  const loadMediaPreview = async (
    templateId: string,
    handle: string,
    mediaType?: string
  ) => {
    if (mediaPreviews[templateId]) return;
    const url = await getMediaPreviewUrl(handle);
    if (url) {
      setMediaPreviews((prev) => ({ ...prev, [templateId]: url }));
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  };

  return (
    <div
      className="flex overflow-hidden w-full"
      ref={containerRef}
      style={{ position: "relative", background: '#f8faf8' }}
    >
      <ConversationList
        conversations={conversations}
        filteredConversations={filteredConversations}
        searchConversations={searchConversations}
        selectedConversationId={selectedConversationId}
        totalUnread={totalUnread}
        displayedConversations={displayedConversations}
        activeTab={activeTab}
        stageFilter={stageFilter}
        timeFilter={timeFilter}
        onSearchChange={handleConversationsSearch}
        onSelectConversation={selectConversation}
        onNewConversation={handleNewConversation}
        onTabChange={setActiveTab}
        onStageFilterChange={setStageFilter}
        onTimeFilterChange={setTimeFilter}
        loading={loading}
      />

      <MessageView
        selectedConversation={selectedConversation}
        newMessage={newMessage}
        sending={sending}
        sendError={sendError}
        onMessageChange={handleMessageChange}
        onSendMessage={sendMessage}
        onKeyPress={handleKeyPress}
        onFileSelect={handleFileSelect}
        onSendVoiceMessage={handleSendVoiceMessage}
        uploading={uploading}
        hasPendingMedia={pendingMedia.length > 0}
        loadingMessages={loadingMessages}
        pendingMedia={pendingMedia}
        onClearPendingMedia={handleClearPendingMedia}
        messagesContainerRef={messagesContainerRef}
        onOpenTemplateModal={() => setShowTemplateModal(true)}
        onOpenContactDetails={() => setShowContactDetails(true)}
        onSelectProduct={handleProductSelect}
        onUpdateConversation={(updatedConv) => {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === updatedConv.id ? updatedConv : conv
            )
          );
        }}
        onRefreshConversations={() => fetchAgentAndConversations(false)}
        agentPrefix={agentPrefix}
        agentId={agentId}
        businessType={businessType}
        onLoadMoreMessages={loadMoreMessages}
        loadingMoreMessages={loadingMoreMessages}
        messagesWerePrepended={messagesWerePrepended}
        messagesPrependedCount={messagesPrependedCount}
        onResetMessagesWerePrepended={() => setMessagesWerePrepended(false)}
        onBack={() => setSelectedConversationId(null)}
      />

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: 18, maxWidth: 440, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: '#0c1a0e' }}>
                New Conversation
              </span>
              <button
                onClick={() => setShowNewConversationModal(false)}
                style={{ background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#71717a', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Search existing customer
                </label>
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchCustomer}
                  onChange={handleCustomerSearch}
                  style={{ width: '100%', padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46', background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9, outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {filteredCustomers.length > 0 && (
                <div style={{ marginBottom: 20, maxHeight: 180, overflowY: 'auto' }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Existing Customers
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: '1px solid #ebebeb', borderRadius: 10, background: 'none', cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.04)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#ebebeb'; }}
                      >
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{customer.name}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#71717a' }}>{customer.phone}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 20 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Or create new customer
                </div>
                <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#3f3f46', display: 'block', marginBottom: 5 }}>
                      Customer Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter customer name"
                      value={customerForm.name}
                      onChange={handleCustomerFormChange}
                      required
                      style={{ width: '100%', padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46', background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#3f3f46', display: 'block', marginBottom: 5 }}>
                      Phone Number
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        value={selectedConversationCountryCode}
                        onChange={(e) => handleConversationCountryChange(e.target.value)}
                        style={{ padding: '9px 8px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46', background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9, outline: 'none', width: 110, flexShrink: 0 }}
                      >
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+94">🇱🇰 +94</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+966">🇸🇦 +966</option>
                        <option value="+92">🇵🇰 +92</option>
                        <option value="+880">🇧🇩 +880</option>
                        <option value="+98">🇮🇷 +98</option>
                        <option value="+20">🇪🇬 +20</option>
                      </select>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number"
                        value={customerForm.phone}
                        onChange={handleCustomerFormChange}
                        required
                        style={{ flex: 1, padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46', background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9, outline: 'none' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                      Full number will be: {selectedConversationCountryCode} {customerForm.phone}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={creatingCustomer}
                    style={{
                      width: '100%',
                      background: creatingCustomer ? 'rgba(34,197,94,0.5)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      padding: '11px 0',
                      fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600,
                      cursor: creatingCustomer ? 'not-allowed' : 'pointer',
                      boxShadow: creatingCustomer ? 'none' : '0 4px 14px rgba(34,197,94,0.3)',
                    }}
                  >
                    {creatingCustomer ? "Creating..." : "Create Customer & Start Chat"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: 18, maxWidth: 440, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: '#0c1a0e' }}>
                Template Required
              </span>
              <button
                onClick={handleCloseTemplateModal}
                style={{ background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: '16px 22px 22px' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#71717a', marginBottom: 16, lineHeight: 1.5 }}>
                The 24-hour messaging window has expired. Please select an approved template to continue the conversation.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {templateError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#f43f5e' }}>
                    {templateError}
                  </div>
                )}
                {templates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                    <svg style={{ width: 40, height: 40, margin: '0 auto 10px', display: 'block', color: '#d4d4d8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#71717a' }}>No templates available yet</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#a1a1aa' }}>Templates will appear here once configured</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Select Template
                    </label>
                    {templates.map((template) => (
                      <div
                        key={template.name}
                        style={{
                          padding: '10px 12px',
                          border: selectedTemplate?.name === template.name ? '1px solid rgba(34,197,94,0.4)' : '1px solid #ebebeb',
                          borderRadius: 10,
                          background: selectedTemplate?.name === template.name ? 'rgba(34,197,94,0.06)' : '#fff',
                          transition: 'all 0.12s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <button
                            onClick={() => handleTemplateSelect(template)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                          >
                            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>
                              {template.name.replace(/_/g, " ").toUpperCase()}
                            </div>
                          </button>
                          <button
                            onClick={() => handleViewTemplate(template)}
                            style={{ background: 'rgba(8,145,178,0.08)', border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2', flexShrink: 0 }}
                            title="View template"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedTemplate && (
                  <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid #f4f4f5', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {requiresMediaHeader && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#3f3f46' }}>
                          Media Header (Required)
                        </label>
                        <input
                          type="file"
                          accept={
                            selectedTemplate.body.components?.find((c: any) => c.type === "HEADER")?.format.toLowerCase() === "image"
                              ? "image/*"
                              : selectedTemplate.body.components?.find((c: any) => c.type === "HEADER")?.format.toLowerCase() === "video"
                              ? "video/*" : "*"
                          }
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleTemplateMediaSelect(file); }}
                          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
                        />
                        {templateMediaUpload && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#71717a' }}>Uploading media...</p>}
                        {templateMedia && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#059669' }}>Media uploaded: {templateMedia.type.toUpperCase()}</p>}
                      </div>
                    )}
                    {selectedTemplate.name === "welcome_template" ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#3f3f46' }}>Business Name</label>
                        <div style={{ padding: '9px 12px', background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46' }}>
                          {agentName || "Your Name"}
                        </div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#a1a1aa' }}>This will automatically use your name as the business name.</p>
                      </div>
                    ) : templateParams.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#3f3f46' }}>Parameters</label>
                        {templateParams.map((_, index) => (
                          <input
                            key={index}
                            type="text"
                            placeholder={`Parameter ${index + 1}`}
                            value={paramInputs[index] || ""}
                            onChange={(e) => handleParamChange(index, e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46', background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9, outline: 'none', boxSizing: 'border-box' }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid #f4f4f5' }}>
                <button
                  onClick={handleCloseTemplateModal}
                  style={{ padding: '9px 18px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#3f3f46', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                >
                  Cancel
                </button>
                <button
                  onClick={sendTemplateMessage}
                  disabled={
                    !selectedTemplate ||
                    (selectedTemplate.name !== "welcome_template" && templateParams.some((p) => !p.trim())) ||
                    (requiresMediaHeader && !templateMedia)
                  }
                  style={{
                    padding: '9px 22px',
                    background: (!selectedTemplate || (selectedTemplate.name !== "welcome_template" && templateParams.some((p) => !p.trim())) || (requiresMediaHeader && !templateMedia))
                      ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                    color: '#fff', border: 'none', borderRadius: 9,
                    cursor: (!selectedTemplate) ? 'not-allowed' : 'pointer',
                    fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                  }}
                >
                  {sending ? "Sending..." : "Send Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Panel */}
      {showContactDetails && selectedConversation && (
        <ContactDetails
          conversation={selectedConversation}
          onClose={() => setShowContactDetails(false)}
          agentPrefix={agentPrefix}
          agentId={agentId}
          onUpdateConversation={(updatedConv) => {
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === updatedConv.id ? updatedConv : conv
              )
            );
          }}
        />
      )}

      {/* View Template Modal */}
      {showViewModal && (
        <ViewTemplateModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          template={selectedViewTemplate}
          mediaPreviews={mediaPreviews}
          loadMediaPreview={loadMediaPreview}
        />
      )}
    </div>
  );
};
export default ConversationsPage;







