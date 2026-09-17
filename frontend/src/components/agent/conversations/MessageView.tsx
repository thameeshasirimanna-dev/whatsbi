import React, { useState, useEffect, useRef, useMemo } from "react";
import { getToken } from "../../../lib/auth";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Mic,
  Paperclip,
  ShoppingBag,
  Layers,
  Package,
  FileText,
  Info,
  Sparkles,
} from "lucide-react";
import { Conversation, Message, GroupedMessage } from "./ConversationsPage";
import ProductSelectorModal from "./ProductSelectorModal";
import ServiceSelectorModal from "./ServiceSelectorModal";
import CustomerOrdersModal from "./CustomerOrdersModal";
import LeadStageModal from "./LeadStageModal";
import { SkeletonMessages } from "../shared/Skeleton";

const formatMessageTime = (timeStr: string) => {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;
  return date.toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
};

const renderWhatsAppFormattedText = (text: string) => {
  if (!text) return null;

  const lines = text.split("\n");

  return lines.map((rawLine, lineIndex) => {
    // Convert leading "* " bullet to unicode "• "
    const line = rawLine.replace(/^([ \t]*)\*[ \t]+(?!\*)/, "$1• ");

    // Tokenize WhatsApp formatting: *bold*, **bold**, _italic_, ~strike~, `code`
    const tokenRegex = /(\*{1,2}[^*\n\s](?:[^*\n]*?[^*\n\s])?\*{1,2}|_[^_\n\s](?:[^_\n]*?[^_\n\s])?_|~[^~\n\s](?:[^~\n]*?[^~\n\s])?~|`[^`\n]+?`)/g;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        elements.push(line.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
        elements.push(
          <strong key={`b-${lineIndex}-${match.index}`} style={{ fontWeight: 700 }}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
        elements.push(
          <strong key={`b-${lineIndex}-${match.index}`} style={{ fontWeight: 700 }}>
            {token.slice(1, -1)}
          </strong>
        );
      } else if (token.startsWith("_") && token.endsWith("_") && token.length > 2) {
        elements.push(
          <em key={`i-${lineIndex}-${match.index}`} style={{ fontStyle: "italic" }}>
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith("~") && token.endsWith("~") && token.length > 2) {
        elements.push(
          <del key={`s-${lineIndex}-${match.index}`} style={{ textDecoration: "line-through", opacity: 0.85 }}>
            {token.slice(1, -1)}
          </del>
        );
      } else if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
        elements.push(
          <code key={`c-${lineIndex}-${match.index}`} style={{ fontFamily: "monospace", fontSize: "0.9em", padding: "1px 4px", background: "rgba(0,0,0,0.06)", borderRadius: 4 }}>
            {token.slice(1, -1)}
          </code>
        );
      } else {
        elements.push(token);
      }
      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      elements.push(line.substring(lastIndex));
    }

    return (
      <React.Fragment key={lineIndex}>
        {elements}
        {lineIndex < lines.length - 1 && "\n"}
      </React.Fragment>
    );
  });
};

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
          <div style={{ border: '1px solid #ebebeb', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, background: '#f9f9f9' }}>
            <div style={{ padding: 8, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 18, height: 18, color: '#71717a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#0c1a0e', margin: 0 }}>Template Header Document</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#71717a', margin: 0 }}>View attached</p>
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
      <div style={{ marginBottom: 8 }}>
        <h4 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#0c1a0e', margin: 0 }}>{headerText}</h4>
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
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#a1a1aa', fontStyle: 'italic', margin: 0 }}>{footerText}</p>
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
            disabled={true}
            title="Template button (historical)"
            style={{ width: '100%', padding: '8px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#059669', cursor: 'default', opacity: 0.7 }}
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
  onRefreshConversations?: () => void;
  agentPrefix?: string | null;
  agentId?: number | null;
  businessType?: string | null;
  onLoadMoreMessages?: () => void;
  loadingMoreMessages?: boolean;
  messagesWerePrepended?: boolean;
  messagesPrependedCount?: number;
  onResetMessagesWerePrepended?: () => void;
  onBack?: () => void;
  loadingMessages?: boolean;
  onSendVoiceMessage?: (file: File) => Promise<void>;
}

const AudioPlayer: React.FC<{ src: string; isAgent: boolean }> = ({ src, isAgent }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    if (audio.duration) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error("Error playing audio:", err));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Visual Theme Setup:
  // For Agent (Green bubble): translucent white controls
  // For Customer (White bubble): clean emerald green controls
  const containerBg = isAgent ? 'rgba(0,0,0,0.12)' : '#f9f9fb';
  const containerBorder = isAgent ? 'none' : '1px solid #ebebeb';
  const playButtonBg = isAgent ? 'rgba(255,255,255,0.2)' : '#22c55e';
  const playButtonHoverBg = isAgent ? 'rgba(255,255,255,0.3)' : '#16a34a';
  const playButtonColor = '#fff';
  const progressBg = isAgent ? 'rgba(255,255,255,0.25)' : 'rgba(34,197,94,0.15)';
  const progressFill = isAgent ? '#fff' : '#22c55e';
  const textColor = isAgent ? 'rgba(255,255,255,0.8)' : '#71717a';
  const titleColor = isAgent ? '#fff' : '#1f2937';

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '12px', 
        borderRadius: '16px', 
        width: '100%', 
        minWidth: '240px', 
        maxWidth: '300px', 
        background: containerBg,
        border: containerBorder,
        boxShadow: isAgent ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          width: '38px', 
          height: '38px', 
          borderRadius: '55%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          border: 'none', 
          cursor: 'pointer', 
          padding: 0,
          background: isHovered ? playButtonHoverBg : playButtonBg,
          color: playButtonColor,
          boxShadow: isAgent ? 'none' : '0 2px 8px rgba(34,197,94,0.25)',
          transition: 'all 0.15s ease',
          flexShrink: 0
        }}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg style={{ width: '16px', height: '16px', fill: 'currentColor' }} viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg style={{ width: '16px', height: '16px', fill: 'currentColor', marginLeft: '2px' }} viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress & Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ 
            fontFamily: "'Plus Jakarta Sans', sans-serif", 
            fontSize: '13px', 
            fontWeight: 600, 
            color: titleColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            Voice message
          </span>
          <span style={{ 
            fontFamily: "'Plus Jakarta Sans', sans-serif", 
            fontSize: '11px', 
            color: textColor 
          }}>
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>
        
        {/* Progress Bar Container */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '12px', cursor: 'pointer' }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSliderChange}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              opacity: 0, 
              cursor: 'pointer', 
              zIndex: 10, 
              margin: 0 
            }}
          />
          {/* Custom Track */}
          <div style={{ 
            width: '100%', 
            height: '6px', 
            borderRadius: '3px', 
            overflow: 'hidden', 
            position: 'relative',
            background: progressBg 
          }}>
            <div
              style={{ 
                width: `${progressPercent}%`, 
                height: '100%', 
                borderRadius: '3px', 
                background: progressFill,
                transition: 'width 0.05s linear' 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

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
  onRefreshConversations,
  agentPrefix,
  agentId,
  businessType,
  onLoadMoreMessages,
  loadingMoreMessages = false,
  messagesWerePrepended = false,
  messagesPrependedCount = 0,
  onResetMessagesWerePrepended,
  onBack,
  loadingMessages = false,
  onSendVoiceMessage,
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        mimeType = "audio/aac";
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          let ext = "webm";
          if (mimeType.includes("ogg")) ext = "ogg";
          else if (mimeType.includes("mp4")) ext = "mp4";
          else if (mimeType.includes("aac")) ext = "aac";
          
          const filename = `voice_note_${Date.now()}.${ext}`;
          const voiceFile = new File([audioBlob], filename, { type: mimeType });
          
          if (onSendVoiceMessage) {
            await onSendVoiceMessage(voiceFile);
          }
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start voice recording:", err);
      alert("Please allow microphone access to record voice messages.");
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        const stream = mediaRecorderRef.current?.stream;
        stream?.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    audioChunksRef.current = [];
  };
  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showLeadStageModal, setShowLeadStageModal] = useState(false);
  const [serviceMessage, setServiceMessage] = useState("");
  const scrollAdjustedRef = useRef(false);
  const lastMessageIdRef = useRef<string | number | null>(null);
  const activeConversationIdRef = useRef<number | null>(null);
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
        const token = getToken();
        const customerResponse = await fetch(
          `${
            import.meta.env.VITE_BACKEND_URL
          }/manage-customers?phone=${encodeURIComponent(
            selectedConversation.customerPhone
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const customerData = await customerResponse.json();
        if (!customerResponse.ok || !customerData.success) {
          console.error("Failed to fetch customer:", customerData.message);
          return;
        }
        const customer = customerData.customer;

        if (!token) return;

        const aiResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/trigger-ai-response`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customer_id: customer?.id || selectedConversation.customerId,
              action_type: "service_inquiry",
              service_id: service.id,
            }),
          }
        );

        if (aiResponse.ok) {
          setServiceMessage(
            `Service "${service.service_name}" details generated by AI Assistant and sent to customer.`
          );
        } else {
          const errData = await aiResponse.json().catch(() => ({}));
          console.error("AI service trigger failed:", errData.error || errData.message);
        }
      } catch (error) {
        console.error("Failed to trigger native AI service:", error);
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
      const isOutbound = msg.sender === "agent" || (msg as any).sender === "chatbot";
      const isOutboundMedia =
        isOutbound && isMedia && !(msg.text || "").trim(); // Empty text indicates grouped media

      if (
        isOutboundMedia &&
        currentGroup &&
        (currentGroup.sender === "agent" || (currentGroup as any).sender === "chatbot") &&
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

  // Adjust scroll position when messages are prepended
  useEffect(() => {
    if (
      messagesWerePrepended &&
      messagesContainerRef.current &&
      messagesPrependedCount > 0 &&
      !scrollAdjustedRef.current
    ) {
      scrollAdjustedRef.current = true;

      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (messagesContainerRef.current) {
          // Estimate scroll adjustment based on number of messages added
          // Conservative estimate for better accuracy
          const estimatedMessageHeight = 120; // pixels per message
          const adjustment = messagesPrependedCount * estimatedMessageHeight;
          messagesContainerRef.current.scrollTop += adjustment;
        }

        // Reset the flag after adjustment
        if (onResetMessagesWerePrepended) {
          onResetMessagesWerePrepended();
        }
        scrollAdjustedRef.current = false;
      }, 0);
    }
  }, [
    messagesWerePrepended,
    messagesPrependedCount,
    onResetMessagesWerePrepended,
  ]);

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

  // Handle scroll to load more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !onLoadMoreMessages) return;

    const handleScroll = () => {
      // Trigger when user scrolls within 100px of the top and content is scrollable
      if (
        container.scrollHeight > container.clientHeight &&
        container.scrollTop <= 100 &&
        !loadingMoreMessages &&
        (selectedConversation?.messages?.length || 0) > 0
      ) {
        onLoadMoreMessages();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [
    messagesContainerRef,
    onLoadMoreMessages,
    loadingMoreMessages,
    selectedConversation?.messages?.length,
  ]);

  // Scroll to bottom instantly when switching conversations or when a new message is appended
  useEffect(() => {
    if (!selectedConversation) {
      lastMessageIdRef.current = null;
      activeConversationIdRef.current = null;
      return;
    }

    const messages = selectedConversation.messages || [];
    const lastMsg = messages[messages.length - 1];
    const lastMsgId = lastMsg ? lastMsg.id : null;
    const conversationId = selectedConversation.id;

    // Check if we switched conversation
    const isConvSwitch = activeConversationIdRef.current !== conversationId;
    
    // Check if a new message was appended to the end of the chat
    const isNewMessageAppended = 
      !isConvSwitch && 
      lastMsgId !== null && 
      lastMsgId !== lastMessageIdRef.current;

    // Update refs
    activeConversationIdRef.current = conversationId;
    lastMessageIdRef.current = lastMsgId;

    if (isConvSwitch || isNewMessageAppended) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        
        // Timeout to ensure browser has completed layout and image renders
        const timer = setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedConversation?.id, selectedConversation?.messages]);

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
    <div
      className={`flex-1 flex flex-col overflow-hidden relative bg-[#F4F7F4] ${
        selectedConversation ? "flex" : "hidden md:flex"
      }`}
    >
      {/* No conversation selected */}
      {!selectedConversation && (
        <div className="flex flex-col justify-center items-center h-full p-8 bg-[#F4F7F4] font-sans select-none">
          <div className="text-center p-8 sm:p-12 max-w-md mx-auto bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_12px_36px_rgba(20,40,24,0.06)] flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#16281D] text-[#9FE870] flex items-center justify-center mb-5 shadow-xs border border-[#9FE870]/30">
              <MessageSquare size={28} strokeWidth={2.2} />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#16281D] tracking-tight mb-2 m-0 font-sans">
              No conversation selected
            </h3>
            <p className="text-xs sm:text-[13px] text-[#71717A] leading-relaxed mb-4 m-0 font-sans">
              Choose a customer conversation from the list to start messaging or manage orders.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F7F4] border border-[#EAEAEA] text-[11px] font-semibold text-[#8FA89B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              Live WhatsApp incoming stream active
            </div>
          </div>
        </div>
      )}

      {/* Chat Header - only show when conversation is selected */}
      {selectedConversation && (
        <div
          className="px-3.5 py-2.5 sm:px-5 sm:py-3 bg-white border-b border-[#EAEAEA] flex items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(20,40,24,0.02)] gap-2 font-sans select-none"
        >
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] flex items-center justify-center transition-all border-0 cursor-pointer shrink-0"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
            </button>
          )}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0 p-1 rounded-xl hover:bg-[#F4F7F4] transition-colors"
            onClick={onOpenContactDetails}
            title="View customer contact details"
          >
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#16281D] text-[#9FE870] font-bold text-xs sm:text-sm flex items-center justify-center border border-[#9FE870]/30 shadow-xs shrink-0"
            >
              {selectedConversation.customerName ? selectedConversation.customerName.charAt(0).toUpperCase() : "C"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 
                  className="text-xs sm:text-sm font-extrabold text-[#16281D] tracking-tight truncate leading-tight m-0 font-sans"
                >
                  {selectedConversation.customerName}
                </h3>
              </div>
              <p 
                className="text-[10px] sm:text-xs text-[#71717A] font-mono truncate m-0 leading-tight mt-0.5"
              >
                {selectedConversation.customerPhone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!selectedConversation.lastUserMessageTime ? (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] shrink-0 font-sans">
                Out of window
              </span>
            ) : (
              (() => {
                const lastTime = new Date(selectedConversation.lastUserMessageTime);
                const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
                const isExpired = hoursSince > 24;
                return (
                  <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 font-sans ${
                    isExpired
                      ? "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]"
                      : "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                  }`}>
                    {isExpired ? "Template Required" : "Free Messaging"}
                  </span>
                );
              })()
            )}
            {currentStageInfo && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F7F4] text-[#16281D] border border-[#EAEAEA] shrink-0 font-sans">
                {currentStageInfo.stage}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowLeadStageModal(true)}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] border border-[#EAEAEA] flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="View Lead Stage"
            >
              <Layers size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={() => setShowOrdersModal(true)}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] border border-[#EAEAEA] flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="View Orders"
            >
              <ShoppingBag size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={onOpenContactDetails}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] border border-[#EAEAEA] flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Customer Information"
            >
              <Info size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}

      {/* Messages - only show when conversation is selected */}
      {selectedConversation && (
        <div
          className="flex-1 overflow-y-auto pb-4 pl-4 custom-scrollbar bg-[#F4F7F4] flex flex-col"
          style={{ willChange: 'scroll-position', contain: 'layout paint' }}
          ref={messagesContainerRef}
        >
          {loadingMessages ? (
            <div className="pt-4">
              <SkeletonMessages count={5} />
            </div>
          ) : selectedConversation.messages.length === 0 ? (
            <div className="flex items-center justify-center flex-1 my-auto">
              <div className="text-center p-6 max-w-sm mx-auto">
                <div className="w-12 h-12 bg-white rounded-2xl border border-[#EAEAEA] shadow-xs flex items-center justify-center mx-auto mb-3 text-[#71717A]">
                  <MessageSquare size={22} />
                </div>
                <h3 className="font-sans text-sm font-bold text-[#16281D] mb-1">
                  No messages yet
                </h3>
                <p className="font-sans text-xs text-[#71717A]">
                  Start the conversation by sending a message below
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {loadingMoreMessages && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#71717a' }}>Loading more messages...</span>
                  </div>
                </div>
              )}
              {groupedMessages.map((messageOrGroup: GroupedMessage) => {
                const isGroup = messageOrGroup.isGroup || false;
                const msg = messageOrGroup;
                const key = isGroup ? `group-${msg.id}` : msg.id;
                const isAgent = msg.sender === "agent" || (msg as any).sender === "chatbot";

                return (
                  <div
                    key={key}
                    style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start', marginTop: 4, marginBottom: 4 }}
                  >
                    <div
                      style={{
                        maxWidth: '78%',
                        padding: '10px 14px',
                        borderRadius: isAgent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        boxShadow: isAgent ? '0 2px 8px rgba(22,40,29,0.18)' : '0 1px 3px rgba(20,40,24,0.03)',
                        marginLeft: isAgent ? 0 : 8,
                        marginRight: isAgent ? 8 : 0,
                        background: isAgent ? '#16281D' : '#FFFFFF',
                        border: isAgent ? '1px solid rgba(255,255,255,0.08)' : '1px solid #EAEAEA',
                        color: isAgent ? '#FFFFFF' : '#16281D',
                      }}
                    >
                      <div className="space-y-3 flex-1">
                        {(() => {
                          const template = parseTemplateMessage(msg.text || "");
                          if (template && isAgent) {
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
                                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: isAgent ? 'rgba(255,255,255,0.7)' : '#a1a1aa', fontStyle: 'italic', marginTop: 4, marginBottom: 0 }}>
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
                                      <AudioPlayer
                                        src={msg.media_url || ""}
                                        isAgent={isAgent}
                                      />
                                    )}
                                    {msg.media_type === "document" && (
                                      <div style={{ border: '1px solid #ebebeb', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, background: isAgent ? 'rgba(255,255,255,0.15)' : '#f9f9f9' }}>
                                        <div style={{ padding: 8, borderRadius: '50%', background: isAgent ? 'rgba(255,255,255,0.2)' : '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <svg style={{ width: 18, height: 18, color: isAgent ? '#fff' : '#71717a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: isAgent ? '#fff' : '#0c1a0e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Document</p>
                                          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: isAgent ? 'rgba(255,255,255,0.7)' : '#71717a', margin: 0 }}>Click to view</p>
                                        </div>
                                        <button
                                          onClick={() => msg.media_url && window.open(msg.media_url, "_blank")}
                                          style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isAgent ? '#fff' : '#71717a' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = isAgent ? 'rgba(255,255,255,0.2)' : '#f4f4f5')}
                                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0, color: isAgent ? '#FFFFFF' : '#16281D' }}>
                                    {renderWhatsAppFormattedText(msg.text)}
                                  </p>
                                )}
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: isAgent ? '#8FA89B' : '#A1A1AA', userSelect: 'none' }}>
                          {formatMessageTime(msg.timestamp)}
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
        <div style={{ background: '#fff', borderTop: '1px solid #ebebeb', padding: '14px 18px', flexShrink: 0 }}>
          {/* Media Preview */}
          {pendingMedia.length > 0 && (
            <div style={{ marginBottom: 12, padding: '12px 14px', border: '1px solid #ebebeb', borderRadius: 12, background: '#f9f9f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#3f3f46' }}>
                  Media Preview ({pendingMedia.length} items)
                </span>
                <button
                  onClick={onClearPendingMedia}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa', display: 'flex', padding: 3, borderRadius: 5, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f43f5e')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}
                  title="Remove media"
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {pendingMedia.map((media, index) => (
                  <div key={index} className="relative w-20 h-20 flex-shrink-0">
                    {media.media_type === "image" && (
                      <img src={media.url} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #ebebeb' }} />
                    )}
                    {(media.media_type === "video" || media.media_type === "audio" || media.media_type === "document") && (
                      <div style={{ width: '100%', height: '100%', borderRadius: 8, border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5' }}>
                        {media.media_type === "video" && (
                          <svg style={{ width: 28, height: 28, color: '#71717a' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                        {media.media_type === "audio" && (
                          <svg style={{ width: 28, height: 28, color: '#71717a' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v10a1 1 0 01-.617.921L6 16a1 1 0 01-1.414-1.414l3.536-3.536A1 1 0 019 11V5a1 1 0 01.383-.924z" clipRule="evenodd" />
                          </svg>
                        )}
                        {media.media_type === "document" && (
                          <svg style={{ width: 24, height: 24, color: '#71717a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#71717A' }}>
                Add a caption below — it will apply to all selected media items
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {/* Product Button - only if business type is product */}
            {isProductBusiness && (
              <button
                type="button"
                onClick={() => setShowProductModal(true)}
                disabled={sending || uploading || isTemplateRequired}
                className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isTemplateRequired
                    ? "bg-black/5 text-[#A1A1AA] border-transparent cursor-not-allowed"
                    : "bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] border-[#EAEAEA]"
                }`}
                title={isTemplateRequired ? "Template required" : "Select Product"}
              >
                <Package size={16} strokeWidth={2.2} />
              </button>
            )}

            {/* Service Button - only if business type is service */}
            {isServiceBusiness && (
              <button
                type="button"
                onClick={() => { setServiceMessage(""); setShowServiceModal(true); }}
                disabled={sending || uploading || isTemplateRequired}
                className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isTemplateRequired
                    ? "bg-black/5 text-[#A1A1AA] border-transparent cursor-not-allowed"
                    : "bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] border-[#EAEAEA]"
                }`}
                title={isTemplateRequired ? "Template required" : "Select Service"}
              >
                <Layers size={16} strokeWidth={2.2} />
              </button>
            )}

            {/* File Upload Button */}
            <div style={{ position: 'relative' }}>
              <button
                ref={attachButtonRef}
                type="button"
                onClick={() => setShowAttachMenu((prev) => !prev)}
                disabled={sending || uploading || isTemplateRequired}
                className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  hasPendingMedia
                    ? "bg-[#16281D] text-[#9FE870] border-[#9FE870]/30 shadow-xs"
                    : isTemplateRequired
                    ? "bg-black/5 text-[#A1A1AA] border-transparent cursor-not-allowed"
                    : "bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] border-[#EAEAEA]"
                }`}
                title={hasPendingMedia ? "Media attached - click to add more" : isTemplateRequired ? "Template required" : "Attach media"}
              >
                {uploading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#16281D]/20 border-t-[#16281D] animate-spin" />
                ) : (
                  <Paperclip size={16} strokeWidth={2.2} />
                )}
              </button>

              {showAttachMenu && (
                <div
                  ref={menuRef}
                  className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-44 bg-white rounded-2xl border border-[#EAEAEA] p-1.5 shadow-[0_12px_36px_rgba(20,40,24,0.14)] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150 origin-bottom-left"
                >
                  {[
                    { label: 'Images', ref: imageInputRef, icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { label: 'Videos', ref: videoInputRef, icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
                    { label: 'Audio', ref: audioInputRef, icon: 'M9 5l7 7-7 7V5z' },
                    { label: 'Documents', ref: documentInputRef, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => { item.ref.current?.click(); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-bold text-[#16281D] hover:bg-[#F4F7F4] active:scale-[0.98] transition-all cursor-pointer border-0 bg-transparent text-left"
                    >
                      <svg className="w-4 h-4 shrink-0 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                      </svg>
                      <span className="font-sans text-xs font-bold text-[#16281D]">{item.label}</span>
                    </button>
                  ))}
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



            {isRecording ? (
              <div 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: '#fff2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: 12, 
                  padding: '10px 14px', 
                  minHeight: 44 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div 
                    style={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: '50%', 
                      background: '#f43f5e', 
                      animation: 'pulse 1.2s infinite' 
                    }} 
                  />
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#f43f5e' }}>
                    Recording... {(() => {
                      const minutes = Math.floor(recordingDuration / 60);
                      const seconds = recordingDuration % 60;
                      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    })()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={cancelRecording}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: '#E11D48', 
                      display: 'flex', 
                      padding: 6, 
                      borderRadius: '50%', 
                      transition: 'background 0.12s' 
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    title="Cancel recording"
                  >
                    <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={stopAndSendRecording}
                    style={{ 
                      background: '#9FE870', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: '#16281D', 
                      display: 'flex', 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      boxShadow: '0 2px 8px rgba(159,232,112,0.35)', 
                      transition: 'all 0.12s' 
                    }}
                    title="Send voice note"
                  >
                    <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={newMessage}
                  onChange={onMessageChange}
                  onKeyDown={onKeyPress}
                  onPaste={handlePaste}
                  placeholder={isTemplateRequired ? "Template required to message..." : "Type your message..."}
                  className={`flex-1 px-3.5 py-2.5 font-sans text-xs sm:text-sm rounded-2xl border outline-none resize-none min-h-[44px] max-h-32 transition-all ${
                    isTemplateRequired
                      ? "bg-black/5 text-[#A1A1AA] border-transparent cursor-not-allowed"
                      : "bg-[#F4F7F4] hover:bg-[#EAEAEA] focus:bg-white text-[#16281D] placeholder-[#A1A1AA] border-[#EAEAEA] focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20"
                  }`}
                  disabled={sending || uploading || isTemplateRequired}
                />
                
                {!newMessage.trim() && !hasPendingMedia ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={sending || uploading || isTemplateRequired}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      isTemplateRequired
                        ? "bg-black/5 text-[#A1A1AA] border-transparent cursor-not-allowed"
                        : "bg-[#F4F7F4] hover:bg-[#EAEAEA] active:scale-95 text-[#16281D] border-[#EAEAEA]"
                    }`}
                    title="Record voice message"
                  >
                    <Mic size={16} strokeWidth={2.2} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSendMessage}
                    disabled={sending || uploading}
                    className="w-10 h-10 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-95 text-[#16281D] flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(159,232,112,0.35)] cursor-pointer border-0 shrink-0"
                    title="Send message"
                  >
                    {sending ? (
                      <div className="w-4 h-4 rounded-full border-2 border-[#16281D]/30 border-t-[#16281D] animate-spin" />
                    ) : (
                      <Send size={15} strokeWidth={2.4} />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
          {isTemplateRequired && onOpenTemplateModal && (
            <button
              type="button"
              onClick={onOpenTemplateModal}
              className="mt-2 w-full h-10 bg-[#F0FDF4] hover:bg-[#DCFCE7] active:scale-[0.98] border border-[#BBF7D0] rounded-full font-sans text-xs font-bold text-[#15803D] shadow-xs cursor-pointer transition-all flex items-center justify-center"
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
            onRefreshConversations={onRefreshConversations}
          />
          <CustomerOrdersModal
            isOpen={showOrdersModal}
            onClose={() => setShowOrdersModal(false)}
            customerId={selectedConversation?.customerId || null}
            customerPhone={selectedConversation?.customerPhone || null}
            customerName={selectedConversation?.customerName || ""}
            agentPrefix={agentPrefix || null}
            agentId={agentId || null}
          />

          {serviceMessage && (
            <p className="font-sans text-xs text-[#15803D] mt-2 pl-1 font-medium">{serviceMessage}</p>
          )}
          {sendError && (
            <p className="font-sans text-xs text-[#EF4444] mt-2 pl-1 font-medium">{sendError}</p>
          )}
        </div>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default MessageView;

