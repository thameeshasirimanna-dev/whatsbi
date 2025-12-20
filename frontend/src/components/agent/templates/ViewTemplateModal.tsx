import React from 'react';
import { XMarkIcon } from "@heroicons/react/24/outline";
import TemplatePreview from './TemplatePreview';

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
  isOpen,
  onClose,
  template,
  mediaPreviews,
  loadMediaPreview
}) => {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Template Preview: {template.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TemplatePreview
            template={template}
            mediaPreviews={mediaPreviews}
            loadMediaPreview={loadMediaPreview}
          />
        </div>
      </div>
    </div>
  );
};

export default ViewTemplateModal;