import React from 'react';
import { X, FileText } from 'lucide-react';
import TemplatePreview from './TemplatePreview';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

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
}

const ViewTemplateModal: React.FC<ViewTemplateModalProps> = ({
  isOpen, onClose, template, mediaPreviews, loadMediaPreview,
}) => {
  if (!isOpen || !template) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={15} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>{template.name}</span>
              <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>{template.category} · {template.language}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} style={{ color: '#71717a' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <TemplatePreview template={template} mediaPreviews={mediaPreviews} loadMediaPreview={loadMediaPreview} />
        </div>
      </div>
    </div>
  );
};

export default ViewTemplateModal;
