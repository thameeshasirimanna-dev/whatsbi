import React from 'react';
import { X, ArrowRight, ArrowLeft, Send, Coins } from 'lucide-react';
import Portal from '../shared/Portal';
import type { Customer } from '../../../lib/api';
import type { MetaTemplate } from './types';
import AudienceStep from './AudienceStep';
import ComposerStep from './ComposerStep';

interface CreateBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  wizardStep: number;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  campaignName: string;
  setCampaignName: (name: string) => void;
  targetAudienceType: 'all' | 'filtered' | 'group' | 'manual';
  setTargetAudienceType: (type: 'all' | 'filtered' | 'group' | 'manual') => void;
  filterLeadStage: string;
  setFilterLeadStage: (stage: string) => void;
  filterInterestStage: string;
  setFilterInterestStage: (stage: string) => void;
  filterConversionStage: string;
  setFilterConversionStage: (stage: string) => void;
  filterLanguage: string;
  setFilterLanguage: (lang: string) => void;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  customerGroups: { id: number; name: string; member_count?: number; color?: string }[];
  customers: Customer[];
  selectedCustomerIds: number[];
  customerSearch: string;
  setCustomerSearch: (q: string) => void;
  onToggleCustomerSelection: (id: number) => void;
  onSelectAllManualCustomers: () => void;
  onClearManualSelection: () => void;
  targetRecipientsCount: number;
  messageType: 'text' | 'template';
  setMessageType: (t: 'text' | 'template') => void;
  textMessage: string;
  setTextMessage: (msg: string) => void;
  selectedTemplateName: string;
  setSelectedTemplateName: (name: string) => void;
  metaTemplates: MetaTemplate[];
  selectedTemplate?: MetaTemplate;
  templateParams: string[];
  onTemplateParamChange: (idx: number, val: string) => void;
  agent: any;
  submittingCampaign: boolean;
  onSubmit: () => void;
}

const CreateBroadcastModal: React.FC<CreateBroadcastModalProps> = ({
  isOpen,
  onClose,
  wizardStep,
  setWizardStep,
  campaignName,
  setCampaignName,
  targetAudienceType,
  setTargetAudienceType,
  filterLeadStage,
  setFilterLeadStage,
  filterInterestStage,
  setFilterInterestStage,
  filterConversionStage,
  setFilterConversionStage,
  filterLanguage,
  setFilterLanguage,
  selectedGroupId,
  setSelectedGroupId,
  customerGroups,
  customers,
  selectedCustomerIds,
  customerSearch,
  setCustomerSearch,
  onToggleCustomerSelection,
  onSelectAllManualCustomers,
  onClearManualSelection,
  targetRecipientsCount,
  messageType,
  setMessageType,
  textMessage,
  setTextMessage,
  selectedTemplateName,
  setSelectedTemplateName,
  metaTemplates,
  selectedTemplate,
  templateParams,
  onTemplateParamChange,
  agent,
  submittingCampaign,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const estimatedCost = targetRecipientsCount * 0.01;
  const agentCredits = agent ? parseFloat(agent.credits || 0) : 0;
  const hasSufficientCredits = messageType === 'text' || agentCredits >= estimatedCost;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-[#16281D]/65 flex items-center justify-center p-2.5 sm:p-4 animate-modal-backdrop">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.15)] w-full max-w-[min(42rem,95vw)] sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-5 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <h3 className="text-sm sm:text-base font-bold text-[#16281D] truncate">Create WhatsApp Broadcast</h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <span
                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors shrink-0 ${
                    wizardStep === 1
                      ? 'bg-[#16281D] text-[#9FE870]'
                      : 'bg-[#F4F7F4] text-[#71717A]'
                  }`}
                >
                  1. Audience
                </span>
                <span
                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors shrink-0 ${
                    wizardStep === 2
                      ? 'bg-[#16281D] text-[#9FE870]'
                      : 'bg-[#F4F7F4] text-[#71717A]'
                  }`}
                >
                  2. Composer
                </span>
                <span
                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors shrink-0 ${
                    wizardStep === 3
                      ? 'bg-[#16281D] text-[#9FE870]'
                      : 'bg-[#F4F7F4] text-[#71717A]'
                  }`}
                >
                  3. Confirm
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {wizardStep === 1 && (
              <AudienceStep
                campaignName={campaignName}
                setCampaignName={setCampaignName}
                targetAudienceType={targetAudienceType}
                setTargetAudienceType={setTargetAudienceType}
                filterLeadStage={filterLeadStage}
                setFilterLeadStage={setFilterLeadStage}
                filterInterestStage={filterInterestStage}
                setFilterInterestStage={setFilterInterestStage}
                filterConversionStage={filterConversionStage}
                setFilterConversionStage={setFilterConversionStage}
                filterLanguage={filterLanguage}
                setFilterLanguage={setFilterLanguage}
                selectedGroupId={selectedGroupId}
                setSelectedGroupId={setSelectedGroupId}
                customerGroups={customerGroups}
                customers={customers}
                selectedCustomerIds={selectedCustomerIds}
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                onToggleCustomerSelection={onToggleCustomerSelection}
                onSelectAllManualCustomers={onSelectAllManualCustomers}
                onClearManualSelection={onClearManualSelection}
                targetRecipientsCount={targetRecipientsCount}
              />
            )}

            {wizardStep === 2 && (
              <ComposerStep
                messageType={messageType}
                setMessageType={setMessageType}
                textMessage={textMessage}
                setTextMessage={setTextMessage}
                selectedTemplateName={selectedTemplateName}
                setSelectedTemplateName={setSelectedTemplateName}
                metaTemplates={metaTemplates}
                selectedTemplate={selectedTemplate}
                templateParams={templateParams}
                onTemplateParamChange={onTemplateParamChange}
              />
            )}

            {wizardStep === 3 && (
              <div className="space-y-5">
                <div className="p-5 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] space-y-3">
                  <div className="border-b border-[#EAEAEA] pb-2.5">
                    <span className="text-[11px] font-semibold text-[#71717A] block">
                      Campaign Name
                    </span>
                    <div className="text-sm font-bold text-[#16281D] mt-0.5">
                      {campaignName || 'Unnamed Campaign'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-[#71717A] block">
                        Target Audience
                      </span>
                      <span className="font-mono font-bold text-[#16281D] mt-0.5 block">
                        {targetRecipientsCount} recipients
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-[#71717A] block">
                        Format
                      </span>
                      <span className="capitalize font-semibold text-[#16281D] mt-0.5 block">
                        {messageType === 'template' ? 'Approved Template' : 'Free-Form Text'}
                      </span>
                    </div>
                  </div>

                  {messageType === 'template' ? (
                    <div className="space-y-2 pt-1 border-t border-[#EAEAEA]">
                      <div>
                        <span className="text-[11px] font-semibold text-[#71717A] block">
                          Template
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#16281D] mt-0.5 block">
                          {selectedTemplateName}
                        </span>
                      </div>
                      {templateParams.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-[#71717A] block mb-1">
                            Variables
                          </span>
                          <div className="space-y-1">
                            {templateParams.map((p, i) => (
                              <div key={i} className="text-xs text-[#16281D] flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-[#71717A]">
                                  {`{{${i + 1}}}`}:
                                </span>
                                <span className="font-medium">
                                  {p || <span className="text-[#EF4444]">Empty</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-[#EAEAEA]">
                      <span className="text-[11px] font-semibold text-[#71717A] block mb-1">
                        Message Preview
                      </span>
                      <div className="p-3 bg-white rounded-xl border border-[#EAEAEA] text-xs text-[#16281D] whitespace-pre-wrap">
                        {textMessage}
                      </div>
                    </div>
                  )}
                </div>

                {/* Credit Cost Estimate */}
                {messageType === 'template' && agent && (
                  <div className="p-4 bg-white rounded-2xl border border-[#EAEAEA] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#9FE870]/20 flex items-center justify-center text-[#16281D]">
                        <Coins size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#16281D]">Credit Estimation</div>
                        <div className="text-[11px] text-[#71717A]">
                          Cost: <span className="font-mono font-semibold">${estimatedCost.toFixed(2)}</span> ($0.01/template)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[#71717A]">Your Balance</div>
                      <div
                        className={`text-sm font-mono font-bold ${
                          hasSufficientCredits ? 'text-[#16281D]' : 'text-[#EF4444]'
                        }`}
                      >
                        ${agentCredits.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-3 sm:px-6 sm:py-4 border-t border-[#EAEAEA] bg-[#F4F7F4] flex items-center justify-between gap-3">
            <div>
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => prev - 1)}
                  disabled={submittingCampaign}
                  className="px-4 py-2 min-h-[38px] rounded-full bg-white border border-[#EAEAEA] hover:border-[#71717A] text-xs font-semibold text-[#16281D] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back
                </button>
              ) : (
                <div />
              )}
            </div>

            <div>
              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => prev + 1)}
                  disabled={wizardStep === 1 && !campaignName.trim()}
                  className="px-5 py-2 min-h-[38px] rounded-full bg-[#9FE870] hover:bg-[#8edb5f] text-xs font-semibold text-[#16281D] flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(159,232,112,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  Next <ArrowRight size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submittingCampaign || !hasSufficientCredits}
                  className="px-5 py-2 min-h-[38px] rounded-full bg-[#9FE870] hover:bg-[#8edb5f] text-xs font-semibold text-[#16281D] flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(159,232,112,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  <Send size={13} />
                  {submittingCampaign ? 'Launching...' : 'Send Broadcast'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CreateBroadcastModal;
