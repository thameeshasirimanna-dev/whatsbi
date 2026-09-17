import React from 'react';
import { Phone, ExternalLink, MessageCircle } from 'lucide-react';

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  components: Array<{
    type: string;
    format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
    text?: string;
    example?: any;
    buttons?: Array<{
      type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY";
      text: string;
      phone_number?: string;
      url?: string;
      payload?: string;
    }>;
  }>;
  body?: any;
  mediaUrls?: { [key: string]: { handle: string; url: string } };
  status: string;
  created_time?: string;
}

type LoadMediaPreview = (templateId: string, handle: string, mediaType: string) => Promise<void>;

interface TemplatePreviewProps {
  template: WhatsAppTemplate;
  mediaPreviews: Record<string, string>;
  loadMediaPreview: LoadMediaPreview;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, mediaPreviews, loadMediaPreview }) => {
  const hasButtons = template.components.some(c => c.type.toLowerCase() === "buttons" && c.buttons && c.buttons.length > 0);

  return (
    <div className="bg-[#E5DDD5] rounded-2xl p-3.5 w-full shadow-inner">
      {/* Label row */}
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[11px] font-semibold text-[#54656F]">WhatsApp Preview</span>
        <span className="text-[10px] text-[#8696A0] font-mono">{template.language}</span>
      </div>

      {/* Bubble */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#EAEAEA]">
        {/* Media header */}
        {(() => {
          const headerComp = template.components.find(c => c.type.toLowerCase() === "header");
          if (headerComp?.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format)) {
            let mediaUrl = template.mediaUrls?.header?.url || mediaPreviews[template.id] || "";
            let handle = template.mediaUrls?.header?.handle || "";
            if (!handle) {
              const handleObj = headerComp.example?.header_handle?.[0];
              if (typeof handleObj === "string") handle = handleObj;
              else if (typeof handleObj === "object") handle = handleObj.handle || handleObj.id || "";
            }
            if (!mediaUrl && handle) {
              loadMediaPreview(template.id, handle, headerComp.format);
              mediaUrl = mediaPreviews[template.id] || "";
            }
            if (mediaUrl) {
              if (headerComp.format === "IMAGE") return <img key="header-img" src={mediaUrl} alt="Header" className="w-full max-h-56 object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />;
              if (headerComp.format === "VIDEO") return <video key="header-video" src={mediaUrl} className="w-full max-h-56 object-cover" muted />;
              return <div key="header-doc" className="bg-[#F4F7F4] py-5 text-center border-b border-[#EAEAEA]"><span className="text-xs text-[#71717A]">📄 Document Header</span></div>;
            } else if (handle) {
              return <div key="header-loading" className="bg-[#F4F7F4] py-5 text-center border-b border-[#EAEAEA]"><span className="text-xs text-[#71717A]">{headerComp.format} Header (loading…)</span></div>;
            } else {
              return <div key="header-empty" className="bg-[#F4F7F4] py-5 text-center border-b border-[#EAEAEA]"><span className="text-xs text-[#71717A]">{headerComp.format} Header (no media)</span></div>;
            }
          } else if (headerComp?.format === "LOCATION") {
            return <div key="header-loc" className="bg-[#DBEAFE] py-5 text-center border-b border-[#BFDBFE]"><span className="text-xs text-[#2563EB] font-medium">📍 Location</span></div>;
          }
          return null;
        })()}

        {/* Text content */}
        <div className={`p-3.5 ${hasButtons ? 'pb-1.5' : 'pb-3.5'}`}>
          {template.components.some(c => c.type.toLowerCase() === "header" && c.format === "TEXT" && c.text) && (
            <p className="text-xs text-[#16281D] font-bold mb-1.5 whitespace-pre-wrap leading-snug">
              {template.components.filter(c => c.type.toLowerCase() === "header" && c.format === "TEXT").map(c => c.text?.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, "[Variable]") || "").join("\n")}
            </p>
          )}

          <p className="text-xs text-[#16281D] leading-relaxed whitespace-pre-wrap mb-1">
            {template.components.filter(c => c.type.toLowerCase() === "body").map(c => c.text?.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, "[Variable]") || "Enter body text...").join("\n")}
          </p>

          {template.components.some(c => c.type.toLowerCase() === "footer") && (
            <p className="text-[11px] text-[#71717A] italic mb-1 whitespace-pre-wrap">
              {template.components.filter(c => c.type.toLowerCase() === "footer").map(c => c.text?.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, "[Variable]") || "").join("\n")}
            </p>
          )}

          <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696A0] mt-1">
            <span>12:00</span>
            <span className="text-[#3B82F6]">✓✓</span>
          </div>
        </div>

        {/* Buttons */}
        {hasButtons && (
          <div className="border-t border-[#EAEAEA] divide-y divide-[#EAEAEA]">
            {template.components.filter(c => c.type.toLowerCase() === "buttons").flatMap(c =>
              (c.buttons || []).map((btn, i) => (
                <div key={i} className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 text-xs font-semibold text-[#0284C7] hover:bg-[#F4F7F4] transition-colors cursor-pointer">
                  {btn.type === "PHONE_NUMBER" && <Phone size={12} />}
                  {btn.type === "URL" && <ExternalLink size={12} />}
                  {btn.type === "QUICK_REPLY" && <MessageCircle size={12} />}
                  <span>{btn.text?.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, "[Variable]") || btn.text || `Button ${i + 1}`}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatePreview;

