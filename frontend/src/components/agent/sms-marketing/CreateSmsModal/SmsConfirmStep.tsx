import React from 'react';
import { Smartphone, Users, FileText, DollarSign, AlertCircle, ShieldCheck } from 'lucide-react';
import type { SmsPartsInfo } from '../smsHelpers';
import { interpolateSmsPreview } from '../smsHelpers';

interface SmsConfirmStepProps {
  campaignName: string;
  smsSenderId?: string;
  smsApiToken?: string;
  recipientsCount: number;
  message: string;
  partsInfo: SmsPartsInfo;
  estimatedCredits: number;
}

export const SmsConfirmStep: React.FC<SmsConfirmStepProps> = ({
  campaignName,
  smsSenderId,
  smsApiToken,
  recipientsCount,
  message,
  partsInfo,
  estimatedCredits,
}) => {
  const isConfigured = Boolean(smsSenderId && smsApiToken);
  const totalSmsSent = recipientsCount * partsInfo.parts;

  return (
    <div className="space-y-5 font-sans">
      {/* Gateway Configuration Status */}
      {!isConfigured ? (
        <div className="flex items-start gap-2.5 p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl text-xs text-[#92400E]">
          <AlertCircle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Text.lk Gateway Credentials Missing</p>
            <p className="text-[11px] text-[#B45309] mt-0.5">
              SMS Sender ID and API Token must be configured by the Super Admin in Workspace Settings before launching campaigns.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#15803D]" />
            <span className="font-semibold text-[#16281D]">
              Verified Gateway: <span className="font-mono">{smsSenderId}</span>
            </span>
          </div>
          <span className="text-[10px] font-semibold text-[#15803D] bg-[#22C55E]/15 px-2.5 py-0.5 rounded-full">
            Active via Text.lk
          </span>
        </div>
      )}

      {/* Campaign Summary Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl">
          <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
            <Users size={12} />
            <span>Recipients</span>
          </p>
          <p className="font-mono text-xl font-bold text-[#16281D] mt-1">
            {recipientsCount}
          </p>
        </div>

        <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl">
          <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
            <FileText size={12} />
            <span>Parts / SMS</span>
          </p>
          <p className="font-mono text-xl font-bold text-[#16281D] mt-1">
            {partsInfo.parts} {partsInfo.parts === 1 ? 'Part' : 'Parts'}
          </p>
        </div>

        <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl">
          <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
            <Smartphone size={12} />
            <span>Total Units</span>
          </p>
          <p className="font-mono text-xl font-bold text-[#16281D] mt-1">
            {totalSmsSent}
          </p>
        </div>

        <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl">
          <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
            <DollarSign size={12} />
            <span>Est. Cost</span>
          </p>
          <p className="font-mono text-xl font-bold text-[#15803D] mt-1">
            ${estimatedCredits.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Campaign Info List */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-4 space-y-2.5 text-xs">
        <div className="flex justify-between items-center py-1 border-b border-[#F4F7F4]">
          <span className="text-[#71717A]">Campaign Name</span>
          <span className="font-semibold text-[#16281D]">{campaignName}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#F4F7F4]">
          <span className="text-[#71717A]">Channel / Protocol</span>
          <span className="font-semibold text-[#16281D]">Direct GSM SMS (Text.lk v3)</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#F4F7F4]">
          <span className="text-[#71717A]">Character Encoding</span>
          <span className="font-semibold text-[#16281D]">
            {partsInfo.isUnicode ? 'UCS-2 Unicode' : 'GSM 7-bit'}
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[#71717A]">Credit Rate</span>
          <span className="font-semibold text-[#16281D]">$0.01 per recipient / part</span>
        </div>
      </div>

      {/* Final Message Preview Box */}
      <div>
        <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
          Sample SMS Message (First Recipient Preview)
        </label>
        <div className="p-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl text-xs text-[#16281D] whitespace-pre-wrap leading-relaxed font-sans">
          {interpolateSmsPreview(message)}
        </div>
      </div>

      <p className="text-[11px] text-[#71717A] leading-relaxed">
        By clicking <strong>Launch Campaign</strong>, SMS messages will be queued and sent via the Text.lk Sri Lanka SMS Gateway. Recipient delivery statuses will update in real time.
      </p>
    </div>
  );
};
