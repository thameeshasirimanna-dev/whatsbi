import React from 'react';
import { Phone, ExternalLink, MessageCircle } from 'lucide-react';

interface TemplateLivePreviewProps {
  header: {
    type: "TEXT" | "MEDIA" | "LOCATION";
    text: string;
    mediaType?: "IMAGE" | "VIDEO" | "DOCUMENT";
    mediaUrl: string;
    mediaHandle: string;
  };
  body: string;
  footer: string;
  buttons: Array<{
    type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY";
    text: string;
  }>;
  examples: Record<string, string>;
}

const TemplateLivePreview: React.FC<TemplateLivePreviewProps> = ({
  header,
  body,
  footer,
  buttons,
  examples,
}) => {
  const replaceVars = (text: string) => {
    return text.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, (_, p) => examples[p] || `{{${p}}}`);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EAEAEA]">
        <span className="text-xs font-bold text-[#16281D] tracking-wide">Live Preview</span>
        <span className="text-[11px] font-medium text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full border border-[#EAEAEA]">
          WhatsApp Bubble
        </span>
      </div>

      <div className="flex-1 flex items-start justify-center">
        <div className="w-full max-w-[320px] bg-[#E5DDD5] p-3 rounded-2xl shadow-inner">
          <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Header Rendering */}
            {header.type === "LOCATION" ? (
              <div className="w-full h-20 bg-[#DBEAFE] flex items-center justify-center text-xs font-semibold text-[#2563EB]">
                📍 Location Map
              </div>
            ) : header.type === "MEDIA" && header.mediaType && header.mediaUrl ? (
              header.mediaType === "IMAGE" ? (
                <img
                  src={header.mediaUrl}
                  alt="Header"
                  className="w-full max-h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : header.mediaType === "VIDEO" ? (
                <video
                  src={header.mediaUrl}
                  className="w-full max-h-48 object-cover"
                  muted
                  controls={false}
                />
              ) : (
                <div className="w-full h-16 bg-[#F4F7F4] flex items-center justify-center text-xs font-medium text-[#71717A]">
                  📄 PDF Document Attachment
                </div>
              )
            ) : header.type === "MEDIA" ? (
              <div className="p-3 text-center bg-[#F4F7F4] text-xs text-[#71717A] italic">
                Media header (upload pending)
              </div>
            ) : null}

            {/* Content Body */}
            <div className="p-3">
              {header.type === "TEXT" && header.text && (
                <p className="text-xs font-bold text-[#16281D] mb-1.5 whitespace-pre-wrap leading-snug">
                  {replaceVars(header.text)}
                </p>
              )}

              <p className="text-xs text-[#16281D] leading-relaxed whitespace-pre-wrap mb-1">
                {replaceVars(body) || (
                  <span className="text-[#A1A1AA] italic">Enter message body text…</span>
                )}
              </p>

              {footer && (
                <p className="text-[11px] text-[#71717A] italic mb-1 whitespace-pre-wrap">
                  {replaceVars(footer)}
                </p>
              )}

              <div className="flex items-center justify-end gap-1 text-[10px] text-[#A1A1AA] mt-1">
                <span>12:00</span>
                <span className="text-[#3B82F6]">✓✓</span>
              </div>

              {/* Action Buttons */}
              {buttons.length > 0 && (
                <div className="mt-2.5 pt-1.5 border-t border-[#EAEAEA] divide-y divide-[#EAEAEA]">
                  {buttons.map((btn, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#0284C7] hover:bg-[#F4F7F4] transition-colors cursor-pointer"
                    >
                      {btn.type === "PHONE_NUMBER" && <Phone size={12} />}
                      {btn.type === "URL" && <ExternalLink size={12} />}
                      {btn.type === "QUICK_REPLY" && <MessageCircle size={12} />}
                      <span>{btn.text || `Button ${i + 1}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateLivePreview;
