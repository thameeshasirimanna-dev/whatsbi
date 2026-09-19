import React from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface MetaCredentialsFieldsProps {
  apiKey: string;
  businessAccountId: string;
  phoneNumberId: string;
  whatsappAppSecret: string;
  showApiKey: boolean;
  showAppSecret: boolean;
  loading: boolean;
  onToggleShowApiKey: () => void;
  onToggleShowAppSecret: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MetaCredentialsFields: React.FC<MetaCredentialsFieldsProps> = ({
  apiKey,
  businessAccountId,
  phoneNumberId,
  whatsappAppSecret,
  showApiKey,
  showAppSecret,
  loading,
  onToggleShowApiKey,
  onToggleShowAppSecret,
  onChange,
}) => {
  return (
    <div className="border-t border-[#F4F4F5] pt-4 mt-1 flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-[#059669]" />
        <span className="text-xs font-bold text-[#16281D] uppercase tracking-wider">
          Meta Business API Credentials (Optional)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Meta API Key */}
        <div>
          <label htmlFor="api_key" className="block text-xs font-bold text-[#52525B] mb-1">
            API Access Token
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              id="api_key"
              name="api_key"
              value={apiKey}
              onChange={onChange}
              placeholder="EAA..."
              disabled={loading}
              className="w-full px-3 py-2 pr-9 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-xs font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
            />
            <button
              type="button"
              onClick={onToggleShowApiKey}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8FA89B] hover:text-[#16281D] border-0 bg-transparent cursor-pointer p-0.5"
              aria-label={showApiKey ? 'Hide token' : 'Show token'}
            >
              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Business Account ID */}
        <div>
          <label htmlFor="business_account_id" className="block text-xs font-bold text-[#52525B] mb-1">
            Business Account ID
          </label>
          <input
            type="text"
            id="business_account_id"
            name="business_account_id"
            value={businessAccountId}
            onChange={onChange}
            placeholder="e.g. 1029384756..."
            disabled={loading}
            className="w-full px-3 py-2 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-xs font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
          />
        </div>

        {/* Phone Number ID */}
        <div>
          <label htmlFor="phone_number_id" className="block text-xs font-bold text-[#52525B] mb-1">
            Phone Number ID
          </label>
          <input
            type="text"
            id="phone_number_id"
            name="phone_number_id"
            value={phoneNumberId}
            onChange={onChange}
            placeholder="e.g. 10987654321..."
            disabled={loading}
            className="w-full px-3 py-2 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-xs font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
          />
        </div>

        {/* App Secret */}
        <div>
          <label htmlFor="whatsapp_app_secret" className="block text-xs font-bold text-[#52525B] mb-1">
            App Secret
          </label>
          <div className="relative">
            <input
              type={showAppSecret ? 'text' : 'password'}
              id="whatsapp_app_secret"
              name="whatsapp_app_secret"
              value={whatsappAppSecret}
              onChange={onChange}
              placeholder="Meta App Secret"
              disabled={loading}
              className="w-full px-3 py-2 pr-9 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-xs font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
            />
            <button
              type="button"
              onClick={onToggleShowAppSecret}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8FA89B] hover:text-[#16281D] border-0 bg-transparent cursor-pointer p-0.5"
              aria-label={showAppSecret ? 'Hide secret' : 'Show secret'}
            >
              {showAppSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
