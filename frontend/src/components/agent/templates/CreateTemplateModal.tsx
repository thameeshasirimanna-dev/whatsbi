import React from 'react';
import { X, Check, Plus, Trash2, Loader2 } from 'lucide-react';
import Portal from '../shared/Portal';
import CustomDropdown from '../shared/CustomDropdown';
import TemplateLivePreview from './TemplateLivePreview';
import {
  useTemplateForm,
  WhatsAppConfig,
  WhatsAppTemplate,
} from './useTemplateForm';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (template: WhatsAppTemplate, isUpdate: boolean) => void;
  config: WhatsAppConfig | null;
  agentPrefix: string | null;
  agentId: string | null;
  initialTemplate?: WhatsAppTemplate | null;
  isEdit: boolean;
}

const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  config,
  agentPrefix,
  agentId,
  initialTemplate,
  isEdit,
}) => {
  const {
    formData,
    setFormData,
    modalError,
    uploading,
    handleInputChange,
    handleExampleChange,
    handleNameChange,
    getAcceptType,
    handleMediaUpload,
    handleSubmit,
    orderedVariables,
  } = useTemplateForm({
    isOpen,
    isEdit,
    initialTemplate,
    config,
    agentPrefix,
    agentId,
    onSuccess,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-[#16281D]/65 flex items-center justify-center p-4 animate-modal-backdrop">
        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.15)] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <h3 className="text-base font-bold text-[#16281D]">
              {isEdit ? "Edit Template" : "Create New WhatsApp Template"}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form Content & Live Preview Split */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Form */}
            <div className="w-full lg:w-[58%] overflow-y-auto p-6 border-r border-[#EAEAEA] space-y-4">
              {modalError && (
                <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">Template Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={isEdit ? handleInputChange : handleNameChange}
                    required={!isEdit}
                    disabled={isEdit}
                    placeholder="e.g. welcome_offer (lowercase & underscores)"
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#16281D] mb-1.5">Category</label>
                    <CustomDropdown
                      value={formData.category}
                      onChange={(val) => setFormData(prev => ({ ...prev, category: val as any }))}
                      options={[
                        { value: 'UTILITY', label: 'Utility' },
                        { value: 'MARKETING', label: 'Marketing' },
                        { value: 'AUTHENTICATION', label: 'Authentication' },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#16281D] mb-1.5">Language</label>
                    <CustomDropdown
                      value={formData.language}
                      onChange={(val) => setFormData(prev => ({ ...prev, language: val }))}
                      options={[
                        { value: 'en_US', label: 'English (en_US)' },
                        { value: 'si', label: 'Sinhala (si)' },
                        { value: 'ta', label: 'Tamil (ta)' },
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Header Section */}
                <div className="pt-3 border-t border-[#F4F7F4] space-y-2.5">
                  <label className="block text-xs font-semibold text-[#16281D]">Header Type</label>
                  <CustomDropdown
                    value={formData.header.type}
                    onChange={(val) => setFormData(prev => ({ ...prev, header: { ...prev.header, type: val as any } }))}
                    options={[
                      { value: 'TEXT', label: 'Text Header' },
                      { value: 'MEDIA', label: 'Media (Image / Video / PDF)' },
                      { value: 'LOCATION', label: 'Location Pin' },
                    ]}
                    className="w-full"
                  />

                  {formData.header.type === "TEXT" && (
                    <input
                      type="text"
                      value={formData.header.text}
                      onChange={e => setFormData(prev => ({ ...prev, header: { ...prev.header, text: e.target.value } }))}
                      placeholder="Header text. E.g. Hello {{customer_name}}"
                      className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
                    />
                  )}

                  {formData.header.type === "MEDIA" && (
                    <div className="space-y-2 bg-[#F4F7F4] p-3 rounded-xl border border-[#EAEAEA]">
                      <CustomDropdown
                        value={formData.header.mediaType || ""}
                        onChange={(val) => setFormData(prev => ({ ...prev, header: { ...prev.header, mediaType: val as any } }))}
                        options={[
                          { value: 'IMAGE', label: 'Image' },
                          { value: 'VIDEO', label: 'Video' },
                          { value: 'DOCUMENT', label: 'Document (PDF)' },
                        ]}
                        placeholder="Select media format"
                        variant="white"
                        className="w-full"
                      />
                      {formData.header.mediaType && (
                        <div className="pt-1">
                          <input
                            type="file"
                            accept={getAcceptType(formData.header.mediaType)}
                            onChange={handleMediaUpload}
                            disabled={uploading}
                            className="text-xs text-[#71717A] file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#16281D] file:text-white hover:file:bg-[#16281D]/80"
                          />
                          {uploading && (
                            <p className="text-xs text-[#0891B2] flex items-center gap-1 mt-1">
                              <Loader2 size={12} className="animate-spin" /> Uploading media asset…
                            </p>
                          )}
                          {formData.header.mediaHandle && !uploading && (
                            <p className="text-xs text-[#15803D] font-medium mt-1">
                              ✓ Uploaded & verified by WhatsApp
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Body Text */}
                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Body Text <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    name="body"
                    value={formData.body}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    placeholder="Enter template message text. Use {{param}} for variable tokens."
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all resize-y"
                  />
                </div>

                {/* Footer Text */}
                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Footer Text <span className="text-[#71717A] font-normal">(optional, max 60 chars)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.footer}
                    onChange={e => setFormData(prev => ({ ...prev, footer: e.target.value }))}
                    placeholder="E.g. Reply STOP to opt out"
                    maxLength={60}
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
                  />
                </div>

                {/* Variables */}
                {orderedVariables.length > 0 && (
                  <div className="pt-3 border-t border-[#F4F7F4] space-y-2">
                    <label className="block text-xs font-semibold text-[#16281D]">Variable Sample Values</label>
                    <div className="space-y-2">
                      {orderedVariables.map(param => (
                        <div key={param} className="flex items-center gap-2">
                          <code className="px-2.5 py-1 rounded-full bg-[#22C55E]/10 text-[#15803D] font-mono text-xs shrink-0">
                            {`{{${param}}}`}
                          </code>
                          <input
                            type="text"
                            value={formData.examples[param] || ""}
                            onChange={e => handleExampleChange(param, e.target.value)}
                            placeholder={`Sample value for {{${param}}}`}
                            className="flex-1 px-3 py-1.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] focus:outline-none focus:border-[#9FE870]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="pt-3 border-t border-[#F4F7F4] space-y-2">
                  <label className="block text-xs font-semibold text-[#16281D]">
                    Interactive Buttons <span className="text-[#71717A] font-normal">(max 3)</span>
                  </label>
                  <div className="space-y-2.5">
                    {formData.buttons.map((btn, index) => (
                      <div key={index} className="p-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#16281D]">Button {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, buttons: prev.buttons.filter((_, i) => i !== index) }))}
                            className="px-2.5 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-[11px] font-semibold flex items-center gap-1 hover:bg-[#EF4444]/20 transition-colors"
                          >
                            <Trash2 size={11} /> Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <CustomDropdown
                            value={btn.type}
                            onChange={(val) => setFormData(prev => ({ ...prev, buttons: prev.buttons.map((b, i) => i === index ? { ...b, type: val as any } : b) }))}
                            options={[
                              { value: 'QUICK_REPLY', label: 'Quick Reply' },
                              { value: 'URL', label: 'URL Link' },
                              { value: 'PHONE_NUMBER', label: 'Phone Call' },
                            ]}
                            variant="white"
                            className="w-full"
                          />
                          <input
                            type="text"
                            value={btn.text}
                            onChange={e => setFormData(prev => ({ ...prev, buttons: prev.buttons.map((b, i) => i === index ? { ...b, text: e.target.value } : b) }))}
                            placeholder="Button label"
                            required
                            className="px-3 py-1.5 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D]"
                          />
                        </div>
                      </div>
                    ))}

                    {formData.buttons.length < 3 && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, buttons: [...prev.buttons, { type: "QUICK_REPLY", text: "" }] }))}
                        className="w-full py-2 border border-dashed border-[#EAEAEA] hover:border-[#9FE870] hover:bg-[#9FE870]/10 rounded-full text-xs font-semibold text-[#16281D] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus size={13} /> Add Button
                      </button>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> {isEdit ? "Update Template" : "Submit to WhatsApp"}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Live Preview */}
            <div className="hidden lg:block w-[42%] bg-[#F4F7F4]/60 p-6 overflow-y-auto">
              <TemplateLivePreview
                header={formData.header}
                body={formData.body}
                footer={formData.footer}
                buttons={formData.buttons}
                examples={formData.examples}
              />
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CreateTemplateModal;
