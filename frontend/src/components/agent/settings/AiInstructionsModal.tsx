import React, { useState, useEffect } from 'react';
import { Bot, X, Check, RotateCcw, Edit3, Eye, Info, Sparkles } from 'lucide-react';

interface AiInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiInstructions: string;
  isOwner: boolean;
  onSaveInstructions: (text: string) => Promise<void>;
  saving: boolean;
  initialTab?: 'edit' | 'preview';
}

const MAX_CHARS = 3000;

const AiInstructionsModal: React.FC<AiInstructionsModalProps> = ({
  isOpen,
  onClose,
  aiInstructions,
  isOwner,
  onSaveInstructions,
  saving,
  initialTab = 'edit',
}) => {
  const [modalText, setModalText] = useState(aiInstructions || '');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setModalText(aiInstructions || '');
      setActiveTab(initialTab);
    }
  }, [isOpen, aiInstructions, initialTab]);

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

  const isDirty = modalText.trim() !== (aiInstructions || '').trim();
  const hasContent = modalText.trim().length > 0;

  const handleSave = async () => {
    if (!isOwner || saving) return;
    await onSaveInstructions(modalText.trim());
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
            <div className="w-10 h-10 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
              <Bot size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                Operational Directives
              </span>
              <h3 className="text-base font-bold text-[#16281D]">AI Agent Instructions & Business Rules</h3>
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
                Specify custom rules, priorities, delivery terms, and greeting instructions for your AI agent. These operational rules take top priority when chatting with customers on WhatsApp.
              </p>
              <textarea
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                disabled={!isOwner || saving}
                maxLength={MAX_CHARS}
                placeholder={`e.g.\n1. Delivery & Orders: Free courier delivery for orders above Rs. 5,000. Orders under Rs. 5,000 have a Rs. 350 standard shipping fee.\n2. Payment Policy: We do not accept Cash on Delivery (COD). All orders require full payment via bank transfer before package dispatch.\n3. Working Hours: Orders placed after 4:00 PM will be processed and handed over to courier the next business day.\n4. Bulk Discounts: If a customer orders 5 or more units of any item, offer a 10% wholesale discount.\n5. Customer Care: Always be warm and polite. If an item is out of stock, recommend similar products from our catalog.`}
                className="w-full flex-1 p-4 sm:p-5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl text-xs sm:text-sm text-[#16281D] leading-relaxed outline-none focus:border-[#0D9488] focus:bg-white focus:ring-2 focus:ring-[#0D9488]/20 transition-all font-sans resize-none min-h-[300px] sm:min-h-[380px] disabled:opacity-60"
              />
              <div className="flex items-center justify-between gap-2 mt-2.5 text-[11px] text-[#71717A]">
                <div className="flex items-center gap-1.5">
                  <Info size={13} className="text-[#71717A] shrink-0" />
                  <span>Rules defined here take top priority over general AI responses.</span>
                </div>
                <span className={`font-mono ${modalText.length > MAX_CHARS * 0.9 ? 'text-[#EF4444] font-semibold' : 'text-[#71717A]'}`}>
                  {modalText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <p className="text-xs text-[#71717A] mb-3">
                Formatted preview of the custom business rules and directives injected into the AI system prompt:
              </p>
              {hasContent ? (
                <div className="flex-1 p-4 sm:p-5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl text-xs sm:text-sm text-[#16281D] leading-relaxed font-sans whitespace-pre-wrap min-h-[300px] sm:min-h-[380px] overflow-y-auto">
                  {modalText}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F4F7F4] border border-dashed border-[#EAEAEA] rounded-2xl min-h-[300px] text-center">
                  <Sparkles size={24} className="text-[#71717A] mb-2" />
                  <span className="text-xs font-semibold text-[#16281D]">No custom AI instructions set yet</span>
                  <span className="text-[11px] text-[#71717A] mt-1 max-w-sm">
                    Switch to the Edit tab above to provide custom business rules, delivery conditions, discount thresholds, and behavioral guidelines.
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
                  onClick={() => setModalText(aiInstructions || '')}
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
                    <span>Save Instructions</span>
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

export default AiInstructionsModal;
