import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
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
        const { data: config } = await supabase
          .from("whatsapp_configuration")
          .select("webhook_url, phone_number_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();

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
      } catch (webhookError) {}

      // Send images directly from our side
      const { data: imageData, error: imageError } =
        await supabase.functions.invoke("send-product-images", {
          body: {
            user_id: user.id,
            agent_prefix: agentPrefix,
            product_id: parseInt(product.id),
            customer_phone: formattedPhone,
          },
        });

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
    if (!agentPrefix || !agentId) return;
    const templatesTable = `${agentPrefix}_templates`;
    const { data, error } = await supabase
      .from(templatesTable)
      .select("*")
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .neq("name", "invoice_template");
    if (error) {
      setTemplateError("Failed to load templates");
    } else {
      setTemplates(data || []);
      setTemplateError(null);
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

      const { data: uploadResult, error: uploadError } =
        await supabase.functions.invoke("upload-media", {
          body: formData,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

      let errMsg;
      if (uploadError) {
        let bodyText = uploadError.body;
        if (typeof bodyText === "string") {
          try {
            const parsed = JSON.parse(bodyText);
            errMsg = parsed.error || parsed.message || bodyText;
          } catch {
            errMsg = bodyText;
          }
        } else if (typeof bodyText === "object" && bodyText !== null) {
          errMsg =
            (bodyText as any).error ||
            (bodyText as any).message ||
            uploadError.message;
        } else {
          errMsg = uploadError.message || "Failed to upload media";
        }
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

      const { data, error } = await supabase.functions.invoke(
        "send-whatsapp-message",
        {
          body: payload,
        }
      );

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

  // Realtime subscription state
  const [customerIds, setCustomerIds] = useState<number[]>([]);
  const [realtimeChannels, setRealtimeChannels] = useState<any[]>([]);

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
    if (!agentPrefix || !agentId) return;

    try {
      const customersTable = `${agentPrefix}_customers`;
      const { data, error } = await supabase
        .from(customersTable)
        .select("id, name, phone, last_user_message_time, ai_enabled")
        .eq("agent_id", agentId);

      if (error) {
        return;
      }

      setCustomers(data || []);
    } catch (err) {}
  }, [agentPrefix, agentId]);

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
    if (
      !agentPrefix ||
      !agentId ||
      !customerForm.name.trim() ||
      !customerForm.phone.trim()
    )
      return;

    const fullPhone =
      `${selectedConversationCountryCode}${customerForm.phone}`.replace(
        "+",
        ""
      );
    setCreatingCustomer(true);
    try {
      const customersTable = `${agentPrefix}_customers`;
      const { data, error } = await supabase
        .from(customersTable)
        .insert({
          name: customerForm.name.trim(),
          phone: fullPhone,
          agent_id: agentId,
          ai_enabled: false,
        })
        .select()
        .single();

      if (error) {
        return;
      }

      setCustomers((prev) => [data, ...prev]);
      setCustomerForm({ name: "", phone: "" });
      setSelectedConversationCountryCode("+94");
      setCreatingCustomer(false);

      // Start conversation with new customer
      startConversationWithCustomer(
        data.id,
        data.name,
        fullPhone,
        data.last_user_message_time
      );
    } catch (err) {
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
    const newConversation = {
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

  // Clear pending media when switching conversations
  useEffect(() => {
    setPendingMedia([]);
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

        // Get agent ID and prefix
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select(
            `
            id,
            agent_prefix,
            business_type,
            users!agents_user_id_fkey (
              name
            )
          `
          )
          .eq("user_id", user.id)
          .single();

        if (agentError || !agentData) {
          setError("Agent not found");
          if (isInitialLoad) setLoading(false);
          return;
        }

        const currentAgentId = agentData.id;
        const currentAgentPrefix = agentData.agent_prefix;
        const currentBusinessType = agentData.business_type;
        const currentAgentName = (agentData as any).users?.name || null;
        setAgentId(currentAgentId);
        setAgentPrefix(currentAgentPrefix);
        setBusinessType(currentBusinessType);
        setAgentName(currentAgentName);

        // Get assigned customers using agent prefix
        if (!currentAgentPrefix) {
          setError("Agent prefix not found");
          if (isInitialLoad) setLoading(false);
          return;
        }

        const customersTable = `${currentAgentPrefix}_customers`;
        const { data: agentCustomers, error: customersError } = await supabase
          .from(customersTable)
          .select(
            "id, name, phone, last_user_message_time, ai_enabled, lead_stage, interest_stage, conversion_stage, created_at"
          )
          .eq("agent_id", currentAgentId);

        setCustomerIds(agentCustomers?.map((c: any) => c.id) || []);

        if (customersError) {
          setError("Failed to fetch assigned customers");
          if (isInitialLoad) setLoading(false);
          return;
        }

        if (!agentCustomers || agentCustomers.length === 0) {
          setConversations([]);
          if (isInitialLoad) setLoading(false);
          return;
        }

        // Fetch messages for all customers
        const customerIds = agentCustomers.map((ac: any) => ac.id);

        const messagesTable = `${currentAgentPrefix}_messages`;
        const { data: messagesData, error: messagesError } = await supabase
          .from(messagesTable)
          .select(
            "id, customer_id, message, direction, timestamp, is_read, media_type, media_url, caption"
          )
          .in("customer_id", customerIds)
          .order("timestamp", { ascending: false });

        if (messagesError) {
          setError("Failed to fetch messages");
          if (isInitialLoad) setLoading(false);
          return;
        }

        // Group messages by customer and create conversations
        const conversationsMap: { [key: number]: Conversation } = {};

        agentCustomers.forEach((ac: any) => {
          const customer = {
            id: ac.id,
            name: ac.name,
            phone: ac.phone,
            last_user_message_time: ac.last_user_message_time,
            aiEnabled: ac.ai_enabled || false,
            leadStage: ac.lead_stage || null,
            interestStage: ac.interest_stage || null,
            conversionStage: ac.conversion_stage || null,
            created_at: ac.created_at,
          };
          const customerMessages =
            messagesData?.filter(
              (msg: any) => msg.customer_id === customer.id
            ) || [];

          // Sort messages by timestamp ascending (oldest first for top-down display)
          customerMessages.sort(
            (a: any, b: any) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          const messages: Message[] = customerMessages.map((msg: any) => ({
            id: msg.id,
            text: (() => {
              const raw = msg.message || "";
              if (raw.trim() && msg.direction === "outbound") {
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed.is_template) {
                    return raw;
                  }
                } catch (e) {
                  // Not template
                }
              }
              return processMessageText(raw, msg.media_type, msg.caption);
            })(),
            sender:
              msg.direction === "inbound" ? "customer" : ("agent" as const),
            timestamp: new Date(msg.timestamp).toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
            rawTimestamp: new Date(msg.timestamp).getTime(),
            isRead: msg.is_read ?? msg.direction === "outbound",
            media_type: msg.media_type || "none",
            media_url: msg.media_url || null,
            caption: msg.caption || null,
          }));

          const unreadCount = messages.filter(
            (msg) => msg.sender === "customer" && !msg.isRead
          ).length;
          const lastRawMessage = customerMessages[customerMessages.length - 1];
          const lastMessageText = lastRawMessage
            ? processMessageText(
                lastRawMessage.message,
                lastRawMessage.media_type,
                lastRawMessage.caption
              )
            : "No messages yet";
          const lastMessageTime = lastRawMessage
            ? new Date(lastRawMessage.timestamp).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })
            : new Date(customer.created_at).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              });
          const rawLastTimestamp = lastRawMessage
            ? new Date(lastRawMessage.timestamp).getTime()
            : new Date(customer.created_at).getTime();

          conversationsMap[customer.id] = {
            id: customer.id,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            lastUserMessageTime: customer.last_user_message_time || null,
            aiEnabled: customer.aiEnabled || false,
            leadStage: customer.leadStage,
            interestStage: customer.interestStage,
            conversionStage: customer.conversionStage,
            lastMessage: lastMessageText,
            lastMessageTime: lastMessageTime,
            rawLastTimestamp,
            unreadCount,
            messages,
          };
        });

        // Sort conversations by last message time (most recent first)
        const sortedConversations = Object.values(conversationsMap);

        // Preserve unread count of 0 for selected conversation to avoid race conditions
        setConversations((prev) => {
          const updatedConversations = sortedConversations.map((newConv) => {
            const existingConv = prev.find((c) => c.id === newConv.id);
            // If this conversation is currently selected and has unreadCount 0, preserve it
            if (
              existingConv &&
              selectedConversationId === newConv.id &&
              existingConv.unreadCount === 0
            ) {
              return { ...newConv, unreadCount: 0 };
            }
            return newConv;
          });

          const finalConversations = updatedConversations.sort(
            (a, b) => b.rawLastTimestamp - a.rawLastTimestamp
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
  const fetchSelectedConversation = useCallback(async () => {
    if (!selectedConversationId || !agentPrefix || !agentId) return;

    const customersTable = `${agentPrefix}_customers`;
    const messagesTable = `${agentPrefix}_messages`;

    // Get customer info
    const { data: customer, error: customerError } = await supabase
      .from(customersTable)
      .select(
        "id, name, phone, last_user_message_time, ai_enabled, lead_stage, interest_stage, conversion_stage"
      )
      .eq("id", selectedConversationId)
      .single();

    if (customerError || !customer) return;

    // Get messages
    const { data: messagesData, error: messagesError } = await supabase
      .from(messagesTable)
      .select("*")
      .eq("customer_id", selectedConversationId)
      .order("timestamp", { ascending: true });

    if (messagesError) return;

    const processedMessages: Message[] = messagesData.map((msg: any) => ({
      id: msg.id,
      text: (() => {
        const raw = msg.message || "";
        if (raw.trim() && msg.direction === "outbound") {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.is_template) {
              return raw;
            }
          } catch (e) {
            // Not template
          }
        }
        return processMessageText(raw, msg.media_type, msg.caption);
      })(),
      sender: msg.direction === "inbound" ? "customer" : "agent",
      timestamp: new Date(msg.timestamp).toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      }),
      rawTimestamp: new Date(msg.timestamp).getTime(),
      isRead: msg.is_read ?? msg.direction === "outbound",
      media_type: msg.media_type || "none",
      media_url: msg.media_url || null,
      caption: msg.caption || null,
    }));

    const unreadCount = processedMessages.filter(
      (m) => m.sender === "customer" && !m.isRead
    ).length;

    const lastMsg = processedMessages[processedMessages.length - 1];
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
      id: customer.id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      lastUserMessageTime: customer.last_user_message_time || null,
      aiEnabled: customer.ai_enabled || false,
      leadStage: customer.lead_stage || null,
      interestStage: customer.interest_stage || null,
      conversionStage: customer.conversion_stage || null,
      lastMessage: lastMessageText,
      lastMessageTime: lastMessageTime,
      rawLastTimestamp: rawLastTimestamp ?? Date.now(),
      unreadCount,
      messages: processedMessages,
    } as Conversation;

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversationId ? updatedConv : conv
      )
    );
  }, [selectedConversationId, agentPrefix, agentId, processMessageText]);

  // Initial fetch
  useEffect(() => {
    fetchAgentAndConversations(true);
  }, []);

  // Realtime subscriptions - stabilized to prevent frequent re-subscribe
  useEffect(() => {
    if (!agentPrefix || !agentId) return;

    const customersTable = `${agentPrefix}_customers`;
    const messagesTable = `${agentPrefix}_messages`;

    let isCurrent = true; // Flag to check if effect is still current

    // Subscribe to messages
    const messagesChannel = supabase
      .channel(`messages-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: messagesTable,
          filter:
            customerIds.length > 0
              ? `customer_id=in.(${customerIds.join(",")})`
              : "*",
        },
        async (payload) => {
          if (!isCurrent) return;

          const newMsg = payload.new;

          let message: Message = {
            id: newMsg.id,
            text: (() => {
              const raw = newMsg.message || "";
              if (raw.trim() && newMsg.direction === "outbound") {
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed.is_template) {
                    return raw;
                  }
                } catch (e) {
                  // Not template
                }
              }
              return processMessageText(raw, newMsg.media_type, newMsg.caption);
            })(),
            sender:
              newMsg.direction === "inbound" ? "customer" : ("agent" as const),
            timestamp: new Date(newMsg.timestamp).toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
            rawTimestamp: new Date(newMsg.timestamp).getTime(),
            isRead: newMsg.is_read ?? newMsg.direction === "outbound",
            media_type: newMsg.media_type || "none",
            media_url: newMsg.media_url || null,
            caption: newMsg.caption || null,
          };

          // If inbound and selected conversation, mark as read immediately
          if (
            newMsg.direction === "inbound" &&
            selectedConversationId === newMsg.customer_id
          ) {
            const { error } = await supabase
              .from(messagesTable)
              .update({ is_read: true })
              .eq("id", newMsg.id);
            if (!error) {
              message.isRead = true;
            }
          }

          // Find or create conversation
          const existingConv = conversations.find(
            (c) => c.customerId === newMsg.customer_id
          );

          if (existingConv) {
            // Update existing conversation
            setConversations((prev) => {
              const existingConvIndex = prev.findIndex(
                (c) => c.customerId === newMsg.customer_id
              );

              if (existingConvIndex === -1) {
                return prev;
              }

              const existingConv = prev[existingConvIndex];
              let updatedMessages = [...existingConv.messages];

              // Add rawTimestamp to the new message for proper sorting
              message.rawTimestamp = new Date(newMsg.timestamp).getTime();

              // Check for optimistic temp message to replace - find the most recent matching temp message
              let tempIndex = -1;
              let replacedTemp = false;
              for (let i = updatedMessages.length - 1; i >= 0; i--) {
                const msg = updatedMessages[i];
                if (
                  typeof msg.id === "string" &&
                  (msg.id.startsWith("temp-") ||
                    msg.id.startsWith("temp-template-")) &&
                  msg.sender === message.sender &&
                  msg.text === message.text
                ) {
                  tempIndex = i;
                  replacedTemp = true;
                  break;
                }
              }

              if (tempIndex !== -1) {
                // Replace temp with real message
                updatedMessages[tempIndex] = message;
              } else {
                // Add new message
                updatedMessages.push(message);
              }

              // Sort messages by rawTimestamp to ensure proper order
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
                newMsg.message,
                newMsg.media_type,
                newMsg.caption
              );
              const updatedConv = {
                ...existingConv,
                messages: updatedMessages,
                lastMessage: lastMessageText,
                lastMessageTime: lastMsg.timestamp,
                rawLastTimestamp: new Date(newMsg.timestamp).getTime(),
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
            const { data: customerData, error } = await supabase
              .from(customersTable)
              .select(
                "id, name, phone, last_user_message_time, lead_stage, interest_stage, conversion_stage"
              )
              .eq("id", newMsg.customer_id)
              .single();

            if (error || !customerData) {
              return;
            }

            const newConv: Conversation = {
              id: customerData.id,
              customerId: customerData.id,
              customerName: customerData.name,
              customerPhone: customerData.phone,
              lastUserMessageTime: customerData.last_user_message_time || null,
              leadStage: null,
              lastMessage: processMessageText(
                newMsg.message,
                newMsg.media_type,
                newMsg.caption
              ),
              lastMessageTime: message.timestamp,
              rawLastTimestamp: new Date(newMsg.timestamp).getTime(),
              unreadCount: message.isRead ? 0 : 1,
              messages: [message],
            };

            setConversations((prev) => {
              const updated = [newConv, ...prev].sort(
                (a, b) => b.rawLastTimestamp - a.rawLastTimestamp
              );
              return updated;
            });
          }
          setLastRealtimeEvent(Date.now()); // Track last event for poll fallback
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: messagesTable,
          filter: "is_read=eq.true",
        },
        (payload: any) => {
          const updatedMsg = payload.new;
          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv.customerId === updatedMsg.customer_id) {
                const updatedMessages = conv.messages.map((m) =>
                  m.id === updatedMsg.id ? { ...m, isRead: true } : m
                );
                const unreadCount = updatedMessages.filter(
                  (m) => m.sender === "customer" && !m.isRead
                ).length;
                return { ...conv, messages: updatedMessages, unreadCount };
              }
              return conv;
            });
            setLastRealtimeEvent(Date.now());
            return updated;
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          // Reconnect attempt
          setTimeout(() => {
            messagesChannel.subscribe();
          }, 3000);
        }
      });

    // Subscribe to customers table updates for the agent
    const customersChannel = supabase
      .channel(`customers-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: customersTable,
          filter: `agent_id=eq.${agentId}`,
        },
        async (payload) => {
          const updatedCustomer = payload.new;
          if (updatedCustomer.last_user_message_time) {
            const lastTime = new Date(updatedCustomer.last_user_message_time);
            const hoursSince =
              (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
            if (hoursSince > 24) {
              // Refetch only if now out of 24h window (status changes to template required)
              await fetchAgentAndConversations(false);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          // Reconnect attempt
          setTimeout(() => {
            customersChannel.subscribe();
          }, 3000);
        }
      });

    setRealtimeChannels([messagesChannel, customersChannel]);

    return () => {
      isCurrent = false;
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(customersChannel);
      setRealtimeChannels([]);
    };
  }, [agentPrefix, agentId]); // Stabilized deps: removed selectedConversationId and conversations

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

      // Mark messages as read in database
      if (agentPrefix && agentId) {
        try {
          const messagesTable = `${agentPrefix}_messages`;
          const { error: updateError } = await supabase
            .from(messagesTable)
            .update({ is_read: true })
            .eq("customer_id", conversation.customerId)
            .eq("direction", "inbound")
            .eq("is_read", false);

          if (!updateError && unreadToMark > 0) {
            // Dispatch custom event for immediate header update
            window.dispatchEvent(
              new CustomEvent("unread-messages-read", {
                detail: { customerId, count: unreadToMark },
              })
            );
          }
        } catch (err) {}
      }
    },
    [agentPrefix, agentId]
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

  // True realtime updates via 1-second polling

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Consolidated scroll to bottom logic
  useEffect(() => {
    if (selectedConversationId !== null && selectedConversation) {
      const timer = setTimeout(scrollToBottom, 150);
      return () => clearTimeout(timer);
    }
  }, [
    selectedConversationId,
    selectedConversation?.messages.length,
    scrollToBottom,
  ]);

  // Fallback polling for realtime drops - selected conversation
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

      const { data: uploadResult, error: uploadError } =
        await supabase.functions.invoke("upload-media", {
          body: formData,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

      let errMsg;
      if (uploadError) {
        let bodyText = uploadError.body;
        if (typeof bodyText === "string") {
          try {
            const parsed = JSON.parse(bodyText);
            errMsg = parsed.error || parsed.message || bodyText;
          } catch {
            errMsg = bodyText;
          }
        } else if (typeof bodyText === "object" && bodyText !== null) {
          errMsg =
            (bodyText as any).error ||
            (bodyText as any).message ||
            uploadError.message;
        } else {
          errMsg = uploadError.message || "Failed to upload media";
        }
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

        const { data: textData, error: textError } =
          await supabase.functions.invoke("send-whatsapp-message", {
            body: textPayload,
          });

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
            await supabase.functions.invoke("send-whatsapp-message", {
              body: imagePayload,
            });
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

        const { data, error } = await supabase.functions.invoke(
          "send-whatsapp-message",
          {
            body: payload,
          }
        );

        if (error || !data?.success) {
          const errorMsg =
            data?.error || error?.message || "Failed to send media";
          if (errorMsg.includes("Template required after 24h window")) {
            if (agentPrefix && agentId) {
              const templatesTable = `${agentPrefix}_templates`;
              const { data: templateData, error: templateError } =
                await supabase
                  .from(templatesTable)
                  .select("*")
                  .eq("agent_id", agentId)
                  .eq("is_active", true)
                  .eq("category", "utility")
                  .neq("name", "invoice_template");
              if (templateError) {
              } else {
                setTemplates(templateData || []);
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
          if (agentPrefix && agentId) {
            const templatesTable = `${agentPrefix}_templates`;
            const { data: templateData, error: templateError } = await supabase
              .from(templatesTable)
              .select("*")
              .eq("agent_id", agentId)
              .eq("is_active", true)
              .eq("category", "utility")
              .neq("name", "invoice_template");
            if (templateError) {
            } else {
              setTemplates(templateData || []);
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

        // Send message via edge function
        const { data, error } = await supabase.functions.invoke(
          "send-whatsapp-message",
          {
            body: {
              user_id: user.id,
              customer_phone: formattedToPhone,
              message: messageText,
              type: "text",
              category: "utility",
            },
          }
        );

        if (error || !data?.success) {
          const errorMsg =
            data?.error || error?.message || "Failed to send message";
          if (errorMsg.includes("Template required after 24h window")) {
            // Fetch templates for this agent
            if (agentPrefix && agentId) {
              const templatesTable = `${agentPrefix}_templates`;
              const { data: templateData, error: templateError } =
                await supabase
                  .from(templatesTable)
                  .select("*")
                  .eq("agent_id", agentId)
                  .eq("is_active", true)
                  .eq("category", "utility");
              if (templateError) {
              } else {
                setTemplates(templateData || []);
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

      const { data: config } = await supabase
        .from("whatsapp_configuration")
        .select("business_account_id, phone_number_id, api_key")
        .eq("user_id", session.user.id)
        .single();

      if (!config) return "";

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
