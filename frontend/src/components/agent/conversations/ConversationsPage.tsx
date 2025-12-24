import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { io, Socket } from "socket.io-client";
import ConversationList from "./ConversationList";
import MessageView from "./MessageView";
import ContactDetails from "./ContactDetails";
import ProductSelectorModal from "./ProductSelectorModal";
import ViewTemplateModal from "../templates/ViewTemplateModal";
import { EyeIcon } from "@heroicons/react/24/outline";

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
  const [searchConversations, setSearchConversations] = useState("");
  const [loading, setLoading] = useState(true);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const formattedPhone = selectedConversation.customerPhone.replace(
        /[\s+]/g,
        ""
      );

      // Trigger agent's webhook with product details and command (regardless of ai_enabled)

      // Refresh conversation
      await fetchSelectedConversation();

      // Trigger agent's webhook with product details and command (regardless of ai_enabled)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
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

              const webhookResponse = await fetch(config.webhook_url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(webhookPayload),
              });

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
        "http://localhost:8080/send-product-images",
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-templates?is_active=true`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", ""); // No caption for header

      const uploadResponse = await fetch("http://localhost:8080/upload-media", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
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
        "http://localhost:8080/send-whatsapp-message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
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

  // Socket.IO connection
  useEffect(() => {
    if (!agentId) return;

    const newSocket = io("http://localhost:8080", {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      // Join agent room
      newSocket.emit("join-agent-room", { agentId, token: "dummy-token" }); // TODO: Add proper JWT token
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    newSocket.on("new-message", (messageData: any) => {
      console.log("Received new message:", messageData);
      // Handle new message similar to realtime logic
      const newMsg: Message = {
        id: messageData.id,
        text: messageData.message || "",
        sender: messageData.sender_type,
        timestamp: new Date(messageData.timestamp).toLocaleString([], {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        rawTimestamp: new Date(messageData.timestamp).getTime(),
        isRead: messageData.sender_type === "agent",
        media_type: messageData.media_type || "none",
        media_url: messageData.media_url || null,
        caption: messageData.caption || null,
      };

      // If inbound and selected conversation, mark as read
      if (
        messageData.sender_type === "customer" &&
        selectedConversationId === messageData.customer_id
      ) {
        // For real-time updates, we mark as read in the UI
        // The backend will handle persistence
        newMsg.isRead = true;
      }

      // Find or create conversation
      const existingConv = conversations.find(
        (c) => c.customerId === messageData.customer_id
      );

      if (existingConv) {
        // Update existing conversation
        setConversations((prev) => {
          const existingConvIndex = prev.findIndex(
            (c) => c.customerId === messageData.customer_id
          );

          if (existingConvIndex === -1) {
            return prev;
          }

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
          const sortedConversations = newConversations.sort(
            (a, b) => b.rawLastTimestamp - a.rawLastTimestamp
          );

          return sortedConversations;
        });
      } else {
        // Create new conversation - fetch customer
        // Since this is real-time, we need to get customer info
        // For now, we'll use a simple approach assuming customer data is available
        // In a full refactor, this should also use backend API
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

        setConversations((prev) => {
          const updated = [newConv, ...prev].sort(
            (a, b) => b.rawLastTimestamp - a.rawLastTimestamp
          );
          return updated;
        });
      }

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
                customerName: messageData.customer_name || `Customer ${messageData.customer_id}`,
                customerPhone: messageData.customer_phone || '',
              }
            },
          })
        );
      }

      setLastRealtimeEvent(Date.now());

      // Scroll to bottom if message is for selected conversation
      if (selectedConversationId === messageData.customer_id && messagesContainerRef.current) {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    });

    newSocket.on("agent-status-update", (statusData: any) => {
      console.log("Received agent status update:", statusData);
      // Handle agent status updates (e.g., credits changed)
      // For now, just log - can be extended to update UI
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [
    agentId,
    agentPrefix,
    selectedConversationId,
    conversations,
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
    const searchTerm = searchConversations.toLowerCase().trim();
    if (!searchTerm) return conversations;

    return conversations.filter(
      (conversation) =>
        conversation.customerName.toLowerCase().includes(searchTerm) ||
        conversation.customerPhone.includes(searchTerm) ||
        conversation.lastMessage.toLowerCase().includes(searchTerm)
    );
  }, [conversations, searchConversations]);

  const handleNewConversation = () => {
    setShowNewConversationModal(true);
  };

  const fetchCustomers = useCallback(async () => {
    if (!agentId) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setCreatingCustomer(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
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
      lastMessageTime: new Date().toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      }),
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

  // Extracted fetch function to make it reusable
  const fetchAgentAndConversations = useCallback(
    async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setLoading(true);
          setError(null);
        }

        // Get authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          setError("User not authenticated");
          if (isInitialLoad) setLoading(false);
          return;
        }

        // Get agent profile from backend
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("User not authenticated");
          if (isInitialLoad) setLoading(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
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
        const currentAgentId = agentData.id;
        const currentAgentPrefix = agentData.agent_prefix;
        const currentBusinessType = agentData.business_type;
        const currentAgentName = agentData.name || null;
        setAgentId(currentAgentId);
        setAgentPrefix(currentAgentPrefix);
        setBusinessType(currentBusinessType);
        setAgentName(currentAgentName);

        // Get conversations using backend API
        const conversationsResponse = await fetch(
          `${
            import.meta.env.VITE_BACKEND_URL
          }/conversations?agentId=${currentAgentId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
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

        // Get customers using backend API
        const customersResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!customersResponse.ok) {
          setError("Failed to fetch customers");
          if (isInitialLoad) setLoading(false);
          return;
        }

        const customersData = await customersResponse.json();
        const agentCustomers = customersData.success
          ? customersData.customers
          : [];

        setCustomerIds(agentCustomers?.map((c: any) => c.id) || []);

        if (!agentCustomers || agentCustomers.length === 0) {
          setConversations([]);
          if (isInitialLoad) setLoading(false);
          return;
        }

        // Preserve unread count of 0 for selected conversation to avoid race conditions
        setConversations((prev) => {
          const updatedConversations = conversationsList.map((newConv: any) => {
            const existingConv = prev.find((c) => c.id === newConv.id);
            // If this conversation is currently selected and has unreadCount 0, preserve it
            if (
              existingConv &&
              selectedConversationId === newConv.id &&
              existingConv.unreadCount === 0
            ) {
              return {
                ...newConv,
                unreadCount: 0,
                messages: existingConv.messages || [],
              };
            }
            // Ensure new conversations have messages array
            return { ...newConv, messages: existingConv?.messages || [] };
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
    [agentPrefix, selectedConversationId]
  ); // Added selectedConversationId dependency

  // Function to fetch only the selected conversation's messages
  const fetchSelectedConversation = useCallback(
    async (loadMore = false) => {
      if (!selectedConversationId || !agentId) return;

      try {
        // Get authenticated session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;

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
              Authorization: `Bearer ${session.access_token}`,
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
          allMessages.forEach(msg => {
            const existing = messageMap.get(msg.id);
            if (!existing || (msg.rawTimestamp || 0) > (existing.rawTimestamp || 0)) {
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
          : new Date().toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            });
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
        const navbarHeight = 80; // Adjust based on actual navbar height
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

      // Immediately update UI to show 0 unread count for better UX
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
        )
      );

      // Mark messages as read
      if (unreadToMark > 0) {
        console.log(
          `Marking ${unreadToMark} messages as read for customer ${customerId}`
        );
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            console.log("Making mark-read request to backend");
            const response = await fetch(
              `${
                import.meta.env.VITE_BACKEND_URL
              }/conversations/${customerId}/mark-read?agentId=${agentId}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );
            console.log(`Mark-read response status: ${response.status}`);
            if (response.ok) {
              const data = await response.json();
              console.log("Messages marked as read successfully:", data);
            } else {
              const errorText = await response.text();
              console.error(
                "Failed to mark messages as read:",
                response.status,
                errorText
              );
            }
          } else {
            console.log("No session token available for mark-read");
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
    if (selectedConversationId && selectedConversation && (!selectedConversation.messages || selectedConversation.messages.length === 0)) {
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

  const resizeImage = (
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 800
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      reader.onerror = reject;
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

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
              });
              resolve(resizedFile);
            } else {
              reject(new Error("Failed to resize image"));
            }
          },
          file.type,
          0.8
        ); // 80% quality
      };

      img.onerror = reject;
    });
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
      "audio/mp4": 16 * 1024 * 1024,
      "audio/ogg": 16 * 1024 * 1024,
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
      // Resize images client-side
      const processedFiles = await Promise.all(
        validFiles.map(async (file) => {
          if (file.type.startsWith("image/")) {
            return await resizeImage(file);
          }
          return file; // Non-images unchanged
        })
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      processedFiles.forEach((file) => formData.append("file", file));

      const uploadResponse = await fetch("http://localhost:8080/upload-media", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
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
          id: item.media_id,
          url: item.media_download_url,
          media_type: item.media_type,
          filename: item.filename,
        }))
      );

      // Clear any previous error
      setSendError(null);
    } catch (error: any) {
      setSendError(`Failed to upload media: ${error.message}`);
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

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

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Not authenticated");
        }

        const textResponse = await fetch(
          "http://localhost:8080/send-whatsapp-message",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
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
              "http://localhost:8080/send-whatsapp-message",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
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
        timestamp: new Date(baseTimestamp + i * 100).toLocaleString([], {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        const formattedPhone = customerPhone.replace(/[\s+]/g, "");

        const payload = {
          user_id: user.id,
          customer_phone: formattedPhone,
          type: mediaType,
          category: "utility",
          caption: caption,
          media_ids: pendingMedia.map((m) => m.id),
        };

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(
          "http://localhost:8080/send-whatsapp-message",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
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
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                if (session?.access_token) {
                  const response = await fetch(
                    `${
                      import.meta.env.VITE_BACKEND_URL
                    }/manage-templates?is_active=true`,
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${session.access_token}`,
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
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (session?.access_token) {
                const response = await fetch(
                  `${
                    import.meta.env.VITE_BACKEND_URL
                  }/manage-templates?is_active=true`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
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
        timestamp: new Date().toLocaleString([], {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Format phone number for WhatsApp API (remove + and spaces)
        const formattedToPhone = customerPhone.replace(/[\s+]/g, "");

        // Send message via Node backend
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(
          "http://localhost:8080/send-whatsapp-message",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
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
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                if (session?.access_token) {
                  const response = await fetch(
                    `${
                      import.meta.env.VITE_BACKEND_URL
                    }/manage-templates?is_active=true`,
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${session.access_token}`,
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return "";

      const configResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
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
      className="flex bg-gray-50 overflow-hidden"
      ref={containerRef}
      style={{ position: "relative" }}
    >
      <ConversationList
        conversations={conversations}
        filteredConversations={filteredConversations}
        searchConversations={searchConversations}
        selectedConversationId={selectedConversationId}
        totalUnread={totalUnread}
        displayedConversations={displayedConversations}
        onSearchChange={handleConversationsSearch}
        onSelectConversation={selectConversation}
        onNewConversation={handleNewConversation}
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
        uploading={uploading}
        hasPendingMedia={pendingMedia.length > 0}
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
        agentPrefix={agentPrefix}
        agentId={agentId}
        businessType={businessType}
        onLoadMoreMessages={loadMoreMessages}
        loadingMoreMessages={loadingMoreMessages}
        messagesWerePrepended={messagesWerePrepended}
        messagesPrependedCount={messagesPrependedCount}
        onResetMessagesWerePrepended={() => setMessagesWerePrepended(false)}
      />

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  New Conversation
                </h3>
                <button
                  onClick={() => setShowNewConversationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search existing customer
                </label>
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchCustomer}
                  onChange={handleCustomerSearch}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {filteredCustomers.length > 0 && (
                <div className="mb-6 max-h-48 overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Existing Customers
                  </h4>
                  <div className="space-y-2">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {customer.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {customer.phone}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Or create new customer
                </h4>
                <form onSubmit={handleCreateCustomer} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter customer name"
                      value={customerForm.name}
                      onChange={handleCustomerFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={selectedConversationCountryCode}
                        onChange={(e) =>
                          handleConversationCountryChange(e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Full number will be: {selectedConversationCountryCode}{" "}
                      {customerForm.phone}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={creatingCustomer}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingCustomer
                      ? "Creating..."
                      : "Create Customer & Start Chat"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Template Required
                </h3>
                <button
                  onClick={handleCloseTemplateModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                The 24-hour messaging window has expired. Please select an
                approved template to continue the conversation.
              </p>

              <div className="space-y-3 mb-6">
                {templateError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {templateError}
                  </div>
                )}
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p>No templates available yet</p>
                    <p className="text-xs">
                      Templates will appear here once configured
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Template
                    </label>
                    {templates.map((template) => (
                      <div
                        key={template.name}
                        className={`p-3 border rounded-lg transition-colors ${
                          selectedTemplate?.name === template.name
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleTemplateSelect(template)}
                            className="text-left"
                          >
                            <div className="font-medium text-gray-900">
                              {template.name.replace(/_/g, " ").toUpperCase()}
                            </div>
                          </button>
                          <button
                            onClick={() => handleViewTemplate(template)}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title="View template"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedTemplate && (
                  <div className="space-y-3 mt-4 pt-4 border-t">
                    {requiresMediaHeader && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Media Header (Required)
                        </label>
                        <input
                          type="file"
                          accept={
                            selectedTemplate.body.components
                              ?.find((c: any) => c.type === "HEADER")
                              ?.format.toLowerCase() === "image"
                              ? "image/*"
                              : selectedTemplate.body.components
                                  ?.find((c: any) => c.type === "HEADER")
                                  ?.format.toLowerCase() === "video"
                              ? "video/*"
                              : "*"
                          }
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleTemplateMediaSelect(file);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        />
                        {templateMediaUpload && (
                          <p className="text-sm text-gray-600">
                            Uploading media...
                          </p>
                        )}
                        {templateMedia && (
                          <p className="text-sm text-green-600">
                            Media uploaded: {templateMedia.type.toUpperCase()}
                          </p>
                        )}
                      </div>
                    )}
                    {selectedTemplate.name === "welcome_template" ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Business Name
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                          {agentName || "Your Name"}
                        </div>
                        <p className="text-xs text-gray-500">
                          This will automatically use your name as the business
                          name.
                        </p>
                      </div>
                    ) : templateParams.length > 0 ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Parameters
                        </label>
                        {templateParams.map((_, index) => (
                          <input
                            key={index}
                            type="text"
                            placeholder={`Parameter ${index + 1}`}
                            value={paramInputs[index] || ""}
                            onChange={(e) =>
                              handleParamChange(index, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseTemplateModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendTemplateMessage}
                  disabled={
                    !selectedTemplate ||
                    (selectedTemplate.name !== "welcome_template" &&
                      templateParams.some((p) => !p.trim())) ||
                    (requiresMediaHeader && !templateMedia)
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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




