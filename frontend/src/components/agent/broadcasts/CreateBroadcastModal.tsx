import React from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Send,
  Users,
  Smartphone,
  MessageSquare,
  FileText,
  DollarSign,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import Portal from '../shared/Portal';
import type { Customer } from '../../../lib/api';
import type { MetaTemplate } from './types';
import AudienceStep from './AudienceStep';
import ComposerStep from './ComposerStep';
import { interpolateBroadcastPreview } from './broadcastHelpers';
import { WhatsApp24hWindowNotice } from './WhatsApp24hWindowNotice';

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
  channel: 'whatsapp' | 'sms';
  setChannel: (c: 'whatsapp' | 'sms') => void;
  smsSenderId?: string;
  smsApiToken?: string;
  smsMessage: string;
  setSmsMessage: (msg: string) => void;
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
  smsPartsInfo?: any;
  estimatedCredits?: number;
  within24hRecipients?: Customer[];
  blockedOutside24hRecipients?: Customer[];
  mediaHeader?: any;
  uploadingMedia?: boolean;
  handleUploadMedia?: (file: File) => Promise<void>;
  handleSetMediaLink?: (link: string) => void;
  handleRemoveMedia?: () => void;
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
  channel,
  setChannel,
  smsSenderId,
  smsApiToken,
  smsMessage,
  setSmsMessage,
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
  smsPartsInfo = { parts: 1, length: 0, isUnicode: false },
  estimatedCredits = 0,
  within24hRecipients = [],
  blockedOutside24hRecipients = [],
  mediaHeader,
  uploadingMedia,
  handleUploadMedia,
  handleSetMediaLink,
  handleRemoveMedia,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const agentWaCredits = agent ? parseFloat(agent.credits || 0) : 0;
  const agentSmsCredits = agent ? parseFloat(agent.sms_credits || 0) : 0;
  const currentBalance = channel === 'sms' ? agentSmsCredits : agentWaCredits;
  const requiresCredits = channel === 'sms' || messageType === 'template';
  const hasSufficientCredits = !requiresCredits || currentBalance >= estimatedCredits;

  const isSmsConfigured = Boolean(smsSenderId && smsApiToken);

  // Compute final message text for step 3 preview
  let sampleFinalText = '';
  if (channel === 'sms') {
    sampleFinalText = interpolateBroadcastPreview(smsMessage);
  } else if (messageType === 'template') {
    let body = selectedTemplate?.components.find((c) => c.type === 'BODY')?.text || '';
    templateParams.forEach((param, index) => {
      const val = param ? interpolateBroadcastPreview(param) : `{{${index + 1}}}`;
      body = body.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), val);
    });
    sampleFinalText = interpolateBroadcastPreview(body);
  } else {
    sampleFinalText = interpolateBroadcastPreview(textMessage);
  }

  const canProceedStep1 = campaignName.trim().length > 0 && targetRecipientsCount > 0;
  const canProceedStep2 =
    channel === 'sms'
      ? smsMessage.trim().length > 0
      : messageType === 'text'
      ? textMessage.trim().length > 0
      : Boolean(selectedTemplateName);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-[#16281D]/65 flex items-center justify-center p-2.5 sm:p-4 animate-modal-backdrop font-sans">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.15)] w-full max-w-[min(56rem,95vw)] sm:max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-5 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <h3 className="text-sm sm:text-base font-bold text-[#16281D] truncate">
                {channel === 'sms'
                  ? 'New SMS Marketing Campaign'
                  : 'New WhatsApp Marketing Campaign'}
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {[
                  { step: 1, label: '1. Audience' },
                  { step: 2, label: '2. Composer & Preview' },
                  { step: 3, label: '3. Review & Launch' },
                ].map((s) => (
                  <span
                    key={s.step}
                    className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors shrink-0 ${
                      wizardStep === s.step
                        ? 'bg-[#16281D] text-[#9FE870]'
                        : 'bg-[#F4F7F4] text-[#71717A]'
                    }`}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors shrink-0 border-0 cursor-pointer"
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
                channel={channel}
                messageType={messageType}
                setMessageType={setMessageType}
              />
            )}

            {wizardStep === 2 && (
              <ComposerStep
                channel={channel}
                setChannel={setChannel}
                smsSenderId={smsSenderId}
                smsMessage={smsMessage}
                setSmsMessage={setSmsMessage}
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
                mediaHeader={mediaHeader}
                uploadingMedia={uploadingMedia}
                onUploadMedia={handleUploadMedia}
                onSetMediaLink={handleSetMediaLink}
                onRemoveMedia={handleRemoveMedia}
                within24hCount={within24hRecipients.length}
                blockedCustomers={blockedOutside24hRecipients}
              />
            )}

            {wizardStep === 3 && (
              <div className="space-y-5">
                {/* 24-Hour Policy Window Notice for WhatsApp Free Text */}
                {channel === 'whatsapp' && messageType === 'text' && (
                  <WhatsApp24hWindowNotice
                    within24hCount={within24hRecipients.length}
                    blockedCustomers={blockedOutside24hRecipients}
                    onSwitchToTemplate={() => {
                      setMessageType('template');
                      setWizardStep(2);
                    }}
                    onSwitchToSms={() => {
                      setChannel('sms');
                      setWizardStep(2);
                    }}
                  />
                )}

                {/* Gateway Status Pill */}
                {channel === 'sms' && !isSmsConfigured ? (
                  <div className="flex items-start gap-2.5 p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl text-xs text-[#92400E]">
                    <AlertCircle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Text.lk Gateway Credentials Missing</p>
                      <p className="text-[11px] text-[#B45309] mt-0.5">
                        SMS Sender ID and API Token must be configured in Workspace Settings before launching campaigns.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#15803D]" />
                      <span className="font-semibold text-[#16281D]">
                        Verified Gateway:{' '}
                        <span className="font-mono">
                          {channel === 'sms' ? smsSenderId || 'TextLK' : 'WhatsApp Cloud API'}
                        </span>
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#15803D] bg-[#22C55E]/15 px-2.5 py-0.5 rounded-full">
                      {channel === 'sms' ? 'Text.lk Carrier Ready' : 'Meta Graph v23.0 Ready'}
                    </span>
                  </div>
                )}

                {/* Summary Matrix Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl">
                    <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
                      <Users size={12} />
                      <span>Recipients</span>
                    </p>
                    <p className="font-mono text-xl font-bold text-[#16281D] mt-1">
                      {targetRecipientsCount}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl">
                    <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
                      <FileText size={12} />
                      <span>Format</span>
                    </p>
                    <p className="text-xs font-bold text-[#16281D] mt-1 capitalize truncate">
                      {channel === 'sms'
                        ? `${smsPartsInfo.parts} Part SMS`
                        : messageType === 'template'
                        ? 'Meta Template'
                        : mediaHeader
                        ? 'Poster + Text'
                        : 'Free Text'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl">
                    <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
                      <Smartphone size={12} />
                      <span>Total Units</span>
                    </p>
                    <p className="font-mono text-xl font-bold text-[#16281D] mt-1">
                      {channel === 'sms'
                        ? targetRecipientsCount * Math.max(1, smsPartsInfo.parts)
                        : targetRecipientsCount}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl">
                    <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
                      <DollarSign size={12} />
                      <span>Est. Cost</span>
                    </p>
                    <p className="font-mono text-xl font-bold text-[#15803D] mt-1 truncate">
                      {channel === 'whatsapp' && messageType === 'text'
                        ? 'Free (Rs. 0)'
                        : `Rs. ${Math.round(estimatedCredits)}`}
                    </p>
                  </div>
                </div>

                {/* Campaign Metadata */}
                <div className="bg-white border border-[#EAEAEA] rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-[#F4F7F4]">
                    <span className="text-[#71717A]">Campaign Name</span>
                    <span className="font-semibold text-[#16281D]">{campaignName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#F4F7F4]">
                    <span className="text-[#71717A]">Channel / Protocol</span>
                    <span className="font-semibold text-[#16281D]">
                      {channel === 'sms'
                        ? 'Direct GSM SMS (Text.lk v3)'
                        : messageType === 'template'
                        ? 'WhatsApp Cloud API (Template)'
                        : 'WhatsApp Cloud API (Free-Form Text)'}
                    </span>
                  </div>
                  {channel === 'sms' && (
                    <div className="flex justify-between items-center py-1 border-b border-[#F4F7F4]">
                      <span className="text-[#71717A]">Encoding</span>
                      <span className="font-semibold text-[#16281D]">
                        {smsPartsInfo.isUnicode ? 'UCS-2 Unicode (70 chars/part)' : 'GSM 7-bit (160 chars/part)'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#71717A]">
                      {channel === 'sms' ? 'SMS Credit Balance' : 'WhatsApp Credit Balance'}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        hasSufficientCredits ? 'text-[#16281D]' : 'text-[#EF4444]'
                      }`}
                    >
                      Rs. {Math.round(currentBalance)}{' '}
                      {!hasSufficientCredits && '(Insufficient Balance)'}
                    </span>
                  </div>
                </div>

                {/* Sample Recipient Preview */}
                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Sample Message (First Recipient Preview with Interpolated Variables)
                  </label>
                  <div className="p-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl text-xs text-[#16281D] font-sans space-y-2">
                    {mediaHeader?.link && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/5 border border-black/10">
                        <img
                          src={mediaHeader.link}
                          alt="Poster preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{sampleFinalText || '(Empty message)'}</p>
                  </div>
                </div>

                <p className="text-[11px] text-[#71717A] leading-relaxed">
                  By clicking <strong>{channel === 'sms' ? 'Launch SMS Broadcast' : 'Launch WhatsApp Broadcast'}</strong>, messages will be queued and sent with dynamic variables replaced for every recipient.
                </p>
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
                  disabled={
                    (wizardStep === 1 && !canProceedStep1) ||
                    (wizardStep === 2 && !canProceedStep2)
                  }
                  className="px-5 py-2 min-h-[38px] rounded-full bg-[#9FE870] hover:bg-[#8edb5f] text-xs font-semibold text-[#16281D] flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(159,232,112,0.3)] disabled:opacity-50 cursor-pointer border-0"
                >
                  Next <ArrowRight size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={
                    submittingCampaign ||
                    !hasSufficientCredits ||
                    (channel === 'sms' && !isSmsConfigured) ||
                    (channel === 'whatsapp' && messageType === 'text' && within24hRecipients.length === 0)
                  }
                  className="px-5 py-2 min-h-[38px] rounded-full bg-[#9FE870] hover:bg-[#8edb5f] text-xs font-semibold text-[#16281D] flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(159,232,112,0.3)] disabled:opacity-50 cursor-pointer border-0"
                >
                  <Send size={13} />
                  {submittingCampaign
                    ? 'Launching...'
                    : channel === 'sms'
                    ? 'Launch SMS Campaign'
                    : 'Launch WhatsApp Campaign'}
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
