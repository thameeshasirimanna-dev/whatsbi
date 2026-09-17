import React from 'react';
import { X, FileText } from 'lucide-react';
import TemplatePreview from './TemplatePreview';
import Portal from '../shared/Portal';

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

interface ViewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WhatsAppTemplate | null;
  mediaPreviews: Record<string, string>;
  loadMediaPreview: (templateId: string, handle: string, mediaType: string) => Promise<void>;
  zIndex?: string;
}

const ViewTemplateModal: React.FC<ViewTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  mediaPreviews,
  loadMediaPreview,
  zIndex = "z-[110]",
}) => {
  if (!isOpen || !template) return null;

  return (
    <Portal>
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className={`fixed inset-0 ${zIndex} bg-[#16281D]/65 flex items-center justify-center p-4 animate-modal-backdrop`}
      >
        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.15)] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#9FE870]/20 text-[#16281D] flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#16281D] font-mono leading-tight">{template.name}</h3>
                <span className="text-xs text-[#71717A] mt-0.5 inline-block">
                  {template.category} · <span className="font-mono">{template.language}</span>
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer border-0"
              title="Close preview"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            <TemplatePreview
              template={template}
              mediaPreviews={mediaPreviews}
              loadMediaPreview={loadMediaPreview}
            />
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ViewTemplateModal;

