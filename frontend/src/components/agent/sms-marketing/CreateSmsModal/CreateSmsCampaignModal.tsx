import React from 'react';
import { X, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import Portal from '../../shared/Portal';
import type { Customer } from '../../../../lib/api';
import { useSmsWizard } from './useSmsWizard';
import { SmsAudienceStep } from './SmsAudienceStep';
import { SmsComposerStep } from './SmsComposerStep';
import { SmsConfirmStep } from './SmsConfirmStep';

interface CreateSmsCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: Customer[];
  smsSenderId?: string;
  smsApiToken?: string;
}

export const CreateSmsCampaignModal: React.FC<CreateSmsCampaignModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customers,
  smsSenderId,
  smsApiToken,
}) => {
  const wizard = useSmsWizard({
    customers,
    smsSenderId,
    smsApiToken,
    isOpen,
    onSuccess,
    onCloseModal: onClose,
  });

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-[#16281D]/65 flex items-center justify-center p-2.5 sm:p-4 animate-modal-backdrop font-sans">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.15)] w-full max-w-[min(52rem,95vw)] max-h-[90vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <h3 className="text-sm sm:text-base font-bold text-[#16281D] truncate">
                Create SMS Campaign (Text.lk)
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <span
                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors shrink-0 ${
                    wizard.step === 1
                      ? 'bg-[#16281D] text-[#9FE870]'
                      : 'bg-[#F4F7F4] text-[#71717A]'
                  }`}
                >
                  1. Audience
                </span>
                <span
                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors shrink-0 ${
                    wizard.step === 2
                      ? 'bg-[#16281D] text-[#9FE870]'
                      : 'bg-[#F4F7F4] text-[#71717A]'
                  }`}
                >
                  2. Message & Preview
                </span>
                <span
                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors shrink-0 ${
                    wizard.step === 3
                      ? 'bg-[#16281D] text-[#9FE870]'
                      : 'bg-[#F4F7F4] text-[#71717A]'
                  }`}
                >
                  3. Review & Launch
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors shrink-0 cursor-pointer border-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {wizard.step === 1 && (
              <SmsAudienceStep
                campaignName={wizard.campaignName}
                setCampaignName={wizard.setCampaignName}
                targetAudienceType={wizard.targetAudienceType}
                setTargetAudienceType={wizard.setTargetAudienceType}
                filterLeadStage={wizard.filterLeadStage}
                setFilterLeadStage={wizard.setFilterLeadStage}
                filterInterestStage={wizard.filterInterestStage}
                setFilterInterestStage={wizard.setFilterInterestStage}
                filterConversionStage={wizard.filterConversionStage}
                setFilterConversionStage={wizard.setFilterConversionStage}
                filterLanguage={wizard.filterLanguage}
                setFilterLanguage={wizard.setFilterLanguage}
                selectedGroupId={wizard.selectedGroupId}
                setSelectedGroupId={wizard.setSelectedGroupId}
                customerGroups={wizard.customerGroups}
                customers={customers}
                selectedCustomerIds={wizard.selectedCustomerIds}
                customerSearch={wizard.customerSearch}
                setCustomerSearch={wizard.setCustomerSearch}
                filteredSearchCustomers={wizard.filteredSearchCustomers}
                toggleCustomerSelection={wizard.toggleCustomerSelection}
                selectAllManualCustomers={wizard.selectAllManualCustomers}
                clearManualSelection={wizard.clearManualSelection}
                validRecipientsCount={wizard.validSmsRecipients.length}
                invalidPhoneCount={wizard.invalidPhoneCount}
              />
            )}

            {wizard.step === 2 && (
              <SmsComposerStep
                message={wizard.message}
                setMessage={wizard.setMessage}
                partsInfo={wizard.partsInfo}
                smsSenderId={smsSenderId}
              />
            )}

            {wizard.step === 3 && (
              <SmsConfirmStep
                campaignName={wizard.campaignName}
                smsSenderId={smsSenderId}
                smsApiToken={smsApiToken}
                recipientsCount={wizard.validSmsRecipients.length}
                message={wizard.message}
                partsInfo={wizard.partsInfo}
                estimatedCredits={wizard.estimatedCredits}
              />
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-t border-[#EAEAEA] bg-white flex items-center justify-between gap-3">
            <div>
              {wizard.step > 1 ? (
                <button
                  type="button"
                  onClick={() => wizard.setStep((prev) => (prev - 1) as 1 | 2)}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-[#EAEAEA] hover:border-[#16281D] font-sans text-xs font-bold text-[#16281D] hover:bg-[#F4F7F4] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer bg-transparent border-0"
                >
                  Cancel
                </button>
              )}
            </div>

            <div>
              {wizard.step < 3 ? (
                <button
                  type="button"
                  disabled={wizard.step === 1 ? !wizard.canProceedStep1 : !wizard.canProceedStep2}
                  onClick={() => wizard.setStep((prev) => (prev + 1) as 2 | 3)}
                  className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-full bg-[#16281D] hover:bg-[#203628] disabled:opacity-40 disabled:cursor-not-allowed text-[#9FE870] font-sans text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-0"
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={wizard.submitting || !smsSenderId}
                  onClick={wizard.handleLaunchCampaign}
                  className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-[#16281D] font-sans text-xs font-bold flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0"
                >
                  {wizard.submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#16281D] border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching SMS...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Launch Campaign</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};
