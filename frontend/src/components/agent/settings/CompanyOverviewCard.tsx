import React, { useState } from 'react';
import { Building2, Check, Sparkles, FileText, Plus, Edit3, Eye } from 'lucide-react';
import CompanyOverviewModal from './CompanyOverviewModal';

interface CompanyOverviewCardProps {
  companyOverview: string;
  isOwner: boolean;
  onSaveOverview: (text: string) => Promise<void>;
  onClearOverview: () => Promise<void>;
  saving: boolean;
}

const CompanyOverviewCard: React.FC<CompanyOverviewCardProps> = ({
  companyOverview,
  isOwner,
  onSaveOverview,
  onClearOverview,
  saving,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'edit' | 'preview'>('edit');

  const hasSavedOverview = Boolean(companyOverview && companyOverview.trim().length > 0);

  const handleOpenModal = (tab: 'edit' | 'preview') => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-4 sm:p-6 md:p-8 flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-[#EAEAEA] mb-6">
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

            {hasSavedOverview ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#22C55E]/10 text-[#15803D] text-[11px] font-semibold">
                <Check size={12} className="text-[#22C55E]" />
                Active Context
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F4F7F4] border border-[#EAEAEA] text-[#71717A] text-[11px] font-medium">
                <Sparkles size={11} className="text-[#71717A]" />
                Default Prompt
              </span>
            )}
          </div>

          <p className="text-xs text-[#71717A] mb-5">
            Provide your company overview, business context, FAQs, or policies. This context enables the AI agent to ground customer answers with precise business context.
          </p>
        </div>

        {/* Compact Status Slot */}
        <div className="mt-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#EAEAEA] flex items-center justify-center shrink-0 text-[#16281D]">
                <FileText size={16} />
              </div>
              <div className="overflow-hidden">
                {hasSavedOverview ? (
                  <span className="text-xs font-bold text-[#16281D] block truncate">
                    Company Overview Configured
                  </span>
                ) : (
                  <span className="text-xs text-[#71717A] block">
                    No company overview added yet
                  </span>
                )}
                <span className="text-[11px] text-[#71717A] block">
                  {hasSavedOverview
                    ? `Active AI Knowledge Source • ${companyOverview.trim().length.toLocaleString()} chars`
                    : 'Default system prompts active'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasSavedOverview ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenModal('preview')}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white border border-[#EAEAEA] hover:border-[#16281D] text-xs font-semibold text-[#16281D] transition-colors"
                  >
                    <Eye size={12} />
                    <span>View</span>
                  </button>

                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenModal('edit')}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white border border-[#EAEAEA] hover:border-[#16281D] text-xs font-semibold text-[#16281D] transition-colors"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={onClearOverview}
                        disabled={saving}
                        className="px-3.5 py-1.5 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-xs font-semibold text-[#EF4444] transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </>
              ) : (
                isOwner && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal('edit')}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] shadow-xs transition-colors"
                  >
                    <Plus size={13} />
                    <span>Add Overview</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Modal Window */}
      <CompanyOverviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        companyOverview={companyOverview}
        isOwner={isOwner}
        initialTab={modalTab}
        onSaveOverview={async (newText) => {
          await onSaveOverview(newText);
          setIsModalOpen(false);
        }}
        saving={saving}
      />
    </>
  );
};

export default CompanyOverviewCard;
