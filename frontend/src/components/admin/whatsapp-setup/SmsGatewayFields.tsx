import React from 'react';
import { Send, Eye, EyeOff, Radio } from 'lucide-react';

interface SmsGatewayFieldsProps {
  smsSenderId: string;
  smsApiToken: string;
  showSmsToken: boolean;
  loading: boolean;
  onToggleShowSmsToken: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SmsGatewayFields: React.FC<SmsGatewayFieldsProps> = ({
  smsSenderId,
  smsApiToken,
  showSmsToken,
  loading,
  onToggleShowSmsToken,
  onChange,
}) => {
  return (
    <div className="border-t border-[#F4F4F5] pt-4 mt-1 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-[#059669]" />
          <span className="text-xs font-bold text-[#16281D] uppercase tracking-wider">
            SMS Gateway (Text.lk Sri Lanka)
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#059669] bg-[#E8F8EE] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
          Normal SMS Marketing
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* SMS Sender ID */}
        <div>
          <label htmlFor="sms_sender_id" className="block text-xs font-bold text-[#52525B] mb-1">
            SMS Sender ID <span className="text-[#059669] font-medium">(Required for SMS)</span>
          </label>
          <input
            type="text"
            id="sms_sender_id"
            name="sms_sender_id"
            value={smsSenderId}
            onChange={onChange}
            placeholder="e.g. TextLKDemo or YourBrand"
            disabled={loading}
            maxLength={11}
            className="w-full px-3 py-2 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-xs font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
          />
          <p className="text-[10px] text-[#8FA89B] font-medium mt-1 m-0">
            Registered alphanumeric sender name approved on Text.lk.
          </p>
        </div>

        {/* Text.lk API Token */}
        <div>
          <label htmlFor="sms_api_token" className="block text-xs font-bold text-[#52525B] mb-1">
            Text.lk API Token <span className="text-[#71717A] font-normal">(Optional Override)</span>
          </label>
          <div className="relative">
            <input
              type={showSmsToken ? 'text' : 'password'}
              id="sms_api_token"
              name="sms_api_token"
              value={smsApiToken}
              onChange={onChange}
              placeholder="7220|vldcGarTLLA..."
              disabled={loading}
              className="w-full px-3 py-2 pr-9 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-xs font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
            />
            <button
              type="button"
              onClick={onToggleShowSmsToken}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8FA89B] hover:text-[#16281D] border-0 bg-transparent cursor-pointer p-0.5"
              aria-label={showSmsToken ? 'Hide token' : 'Show token'}
            >
              {showSmsToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-[#8FA89B] font-medium mt-1 m-0">
            Leave blank to use server environment default token.
          </p>
        </div>
      </div>
    </div>
  );
};
