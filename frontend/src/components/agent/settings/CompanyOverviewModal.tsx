import React, { useState, useEffect } from 'react';
import { Building2, X, Check, RotateCcw, Edit3, Eye, Info, Sparkles } from 'lucide-react';

interface CompanyOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyOverview: string;
  isOwner: boolean;
  onSaveOverview: (text: string) => Promise<void>;
  saving: boolean;
  initialTab?: 'edit' | 'preview';
}

const MAX_CHARS = 3000;

const CompanyOverviewModal: React.FC<CompanyOverviewModalProps> = ({
  isOpen,
  onClose,
  companyOverview,
  isOwner,
  onSaveOverview,
  saving,
  initialTab = 'edit',
}) => {
  const [modalText, setModalText] = useState(companyOverview || '');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setModalText(companyOverview || '');
      setActiveTab(initialTab);
    }
  }, [isOpen, companyOverview, initialTab]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDirty = modalText.trim() !== (companyOverview || '').trim();
  const hasContent = modalText.trim().length > 0;

  const handleSave = async () => {
    if (!isOwner || saving) return;
    await onSaveOverview(modalText.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#16281D]/65 flex items-center justify-center p-3 sm:p-6 animate-modal-backdrop font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-[24px] sm:rounded-[28px] border border-[#EAEAEA] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#EAEAEA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                Knowledge Grounding
              </span>
              <h3 className="text-base font-bold text-[#16281D]">Company Overview</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="flex items-center bg-[#F4F7F4] p-1 rounded-full border border-[#EAEAEA]">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'edit'
                    ? 'bg-white text-[#16281D] shadow-xs'
                    : 'text-[#71717A] hover:text-[#16281D]'
                }`}
              >
                <Edit3 size={12} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#16281D] shadow-xs'
                    : 'text-[#71717A] hover:text-[#16281D]'
                }`}
              >
                <Eye size={12} />
                <span>Preview</span>
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-9 h-9 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717A] hover:text-[#16281D] transition-colors"
              title="Close window"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex flex-col">
          {activeTab === 'edit' ? (
            <div className="flex-1 flex flex-col">
              <p className="text-xs text-[#71717A] mb-3">
                Edit your company context, business policies, working hours, and FAQs. This grounds the AI chatbot answers on WhatsApp.
              </p>
              <textarea
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                disabled={!isOwner || saving}
                maxLength={MAX_CHARS}
                placeholder={`e.g.\nWorking Hours: Monday – Saturday, 9:00 AM – 7:00 PM (Closed on Sundays)\nDelivery: Island-wide delivery within 2–3 business days via courier (LKR 350 standard fee)\nExchange Policy: Items can be exchanged within 7 days with original receipt. No cash refunds.\nPayment Methods: Bank transfer, Koko, or Cash on Delivery (COD)\nStore Location: 123 Galle Road, Colombo 03`}
                className="w-full flex-1 p-4 sm:p-5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl text-xs sm:text-sm text-[#16281D] leading-relaxed outline-none focus:border-[#9FE870] focus:bg-white focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-sans resize-none min-h-[300px] sm:min-h-[380px] disabled:opacity-60"
              />
              <div className="flex items-center justify-between gap-2 mt-2.5 text-[11px] text-[#71717A]">
                <div className="flex items-center gap-1.5">
                  <Info size={13} className="text-[#71717A] shrink-0" />
                  <span>Supports plain text guidelines, bullet points, and operational details.</span>
                </div>
                <span className={`font-mono ${modalText.length > MAX_CHARS * 0.9 ? 'text-[#EF4444] font-semibold' : 'text-[#71717A]'}`}>
                  {modalText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <p className="text-xs text-[#71717A] mb-3">
                Formatted preview of the knowledge grounding context provided to the AI chatbot:
              </p>
              {hasContent ? (
                <div className="flex-1 p-4 sm:p-5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl text-xs sm:text-sm text-[#16281D] leading-relaxed font-sans whitespace-pre-wrap min-h-[300px] sm:min-h-[380px] overflow-y-auto">
                  {modalText}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F4F7F4] border border-dashed border-[#EAEAEA] rounded-2xl min-h-[300px] text-center">
                  <Sparkles size={24} className="text-[#71717A] mb-2" />
                  <span className="text-xs font-semibold text-[#16281D]">No company overview entered yet</span>
                  <span className="text-[11px] text-[#71717A] mt-1 max-w-sm">
                    Switch to the Edit tab above to add working hours, delivery policies, return guidelines, and FAQs.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-t border-[#EAEAEA] bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-full bg-white border border-[#EAEAEA] hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] transition-colors"
          >
            Close
          </button>

          {isOwner && (
            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  type="button"
                  onClick={() => setModalText(companyOverview || '')}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#EAEAEA] hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#16281D] border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Overview</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyOverviewModal;
