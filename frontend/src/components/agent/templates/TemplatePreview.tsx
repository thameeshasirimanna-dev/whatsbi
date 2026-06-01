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

const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, mediaPreviews, loadMediaPreview }) => {
  const hasButtons = template.components.some(c => c.type.toLowerCase() === "buttons" && c.buttons && c.buttons.length > 0);

  return (
    <div style={{ background: '#e9ebee', borderRadius: 14, padding: 14, width: '100%' }}>
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Your template</span>
        <span style={{ ...DM, fontSize: 10, color: '#9ca3af' }}>Template</span>
      </div>

      {/* White bubble */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
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
              if (headerComp.format === "IMAGE") return <img key="header-img" src={mediaUrl} alt="Header" style={{ width: '100%', display: 'block' }} onError={e => { e.currentTarget.style.display = "none"; }} />;
              if (headerComp.format === "VIDEO") return <video key="header-video" src={mediaUrl} style={{ width: '100%', display: 'block' }} muted />;
              return <div key="header-doc" style={{ background: '#f3f4f6', padding: '20px 0', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}><span style={{ ...DM, fontSize: 12, color: '#6b7280' }}>📄 Document Header</span></div>;
            } else if (handle) {
              return <div key="header-loading" style={{ background: '#f3f4f6', padding: '20px 0', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}><span style={{ ...DM, fontSize: 12, color: '#6b7280' }}>{headerComp.format} Header (loading…)</span></div>;
            } else {
              return <div key="header-empty" style={{ background: '#f3f4f6', padding: '20px 0', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}><span style={{ ...DM, fontSize: 12, color: '#6b7280' }}>{headerComp.format} Header (no media)</span></div>;
            }
          } else if (headerComp?.format === "LOCATION") {
            return <div key="header-loc" style={{ background: '#dbeafe', padding: '20px 0', textAlign: 'center', borderBottom: '1px solid #bfdbfe' }}><span style={{ ...DM, fontSize: 12, color: '#2563eb' }}>📍 Location</span></div>;
          }
          return null;
        })()}

        {/* Text content */}
        <div style={{ padding: '12px 14px', paddingBottom: hasButtons ? 6 : 12 }}>
          {template.components.some(c => c.type.toLowerCase() === "header" && c.format === "TEXT" && c.text) && (
            <p style={{ ...DM, fontSize: 13, color: '#111827', fontWeight: 700, marginBottom: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {template.components.filter(c => c.type.toLowerCase() === "header" && c.format === "TEXT").map(c => c.text?.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, "[Variable]") || "").join("\n")}
            </p>
          )}

          <p style={{ ...DM, fontSize: 13, color: '#1f2937', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 4 }}>
            {template.components.filter(c => c.type.toLowerCase() === "body").map(c => c.text?.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, "[Variable]") || "Enter body text...").join("\n")}
          </p>

          {template.components.some(c => c.type.toLowerCase() === "footer") && (
            <p style={{ ...DM, fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginBottom: 4, whiteSpace: 'pre-wrap' }}>
              {template.components.filter(c => c.type.toLowerCase() === "footer").map(c => c.text?.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, "[Variable]") || "").join("\n")}
            </p>
          )}

          <p style={{ ...DM, fontSize: 10, color: '#9ca3af', textAlign: 'right' }}>13:40 ✓✓</p>
        </div>

        {/* Buttons */}
        {hasButtons && (
          <div style={{ borderTop: '1px solid #e5e7eb' }}>
            {template.components.filter(c => c.type.toLowerCase() === "buttons").flatMap(c =>
              (c.buttons || []).map((btn, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', color: '#0ea5e9', ...DM, fontSize: 13, fontWeight: 500, borderTop: i > 0 ? '1px solid #e5e7eb' : 'none' }}>
                  {btn.type === "PHONE_NUMBER" && <Phone size={13} />}
                  {btn.type === "URL" && <ExternalLink size={13} />}
                  {btn.type === "QUICK_REPLY" && <MessageCircle size={13} />}
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
