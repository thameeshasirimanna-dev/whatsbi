import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Loader2,
} from 'lucide-react';
import { getToken } from '../lib/auth';

interface WhatsAppConfig {
  whatsapp_number: string;
  webhook_url?: string;
  api_key?: string;
  business_account_id?: string;
  phone_number_id?: string;
  whatsapp_app_secret?: string;
  deepseek_api_key?: string;
}

interface WhatsAppSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedAgent?: {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
  } | null;
  initialConfig?: {
    whatsapp_number: string;
    webhook_url?: string;
    api_key?: string;
    business_account_id?: string;
    phone_number_id?: string;
    whatsapp_app_secret?: string;
    deepseek_api_key?: string;
    is_active: boolean;
  } | null;
}

export const WhatsAppSetupModal: React.FC<WhatsAppSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedAgent,
  initialConfig,
}) => {
  const [formData, setFormData] = useState<WhatsAppConfig>({
    whatsapp_number: '',
    webhook_url: '',
    api_key: '',
    business_account_id: '',
    phone_number_id: '',
    whatsapp_app_secret: '',
    deepseek_api_key: '',
  });
  const [showDeepSeekKey, setShowDeepSeekKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setFormData({
        whatsapp_number: initialConfig.whatsapp_number || '',
        webhook_url: initialConfig.webhook_url || '',
        api_key: initialConfig.api_key || '',
        business_account_id: initialConfig.business_account_id || '',
        phone_number_id: initialConfig.phone_number_id || '',
        whatsapp_app_secret: initialConfig.whatsapp_app_secret || '',
        deepseek_api_key: initialConfig.deepseek_api_key || '',
      });
    } else {
      setFormData({
        whatsapp_number: '',
        webhook_url: '',
        api_key: '',
        business_account_id: '',
        phone_number_id: '',
        whatsapp_app_secret: '',
        deepseek_api_key: '',
      });
    }
  }, [initialConfig, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.whatsapp_number.trim()) {
      setError('WhatsApp phone number is required');
      return false;
    }
    const whatsappRegex = /^\+?[1-9]\d{1,14}$/;
    if (!whatsappRegex.test(formData.whatsapp_number.replace(/\D/g, ''))) {
      setError('Please enter a valid WhatsApp number in international format (e.g. +1234567890)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;
    if (!selectedAgent) {
      setError('No agent selected for WhatsApp setup');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        user_id: selectedAgent.user_id,
        whatsapp_number: formData.whatsapp_number.trim(),
        webhook_url: '',
        api_key: formData.api_key?.trim() || null,
        business_account_id: formData.business_account_id?.trim() || null,
        phone_number_id: formData.phone_number_id?.trim() || null,
        whatsapp_app_secret: formData.whatsapp_app_secret?.trim() || null,
        deepseek_api_key: formData.deepseek_api_key?.trim() || null,
      };

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const token = getToken();

      const response = await fetch(`${backendUrl}/setup-whatsapp-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to setup WhatsApp configuration');
      }
      if (!data.success) {
        throw new Error(data.message || 'Failed to setup WhatsApp configuration');
      }

      setSuccessMessage('WhatsApp configuration committed successfully!');
      onSuccess();

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('WhatsApp setup error:', err);
      setError(err.message || 'Failed to setup WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccessMessage(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] border border-[#EAEAEA] shadow-[0_24px_72px_rgba(20,40,24,0.18)] max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0">
              <MessageSquare size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#16281D] m-0 tracking-tight leading-snug">
                {selectedAgent ? `WhatsApp Setup — ${selectedAgent.user_name}` : 'Setup WhatsApp Instance'}
              </h3>
              <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
                Configure Meta Business Cloud API and dedicated DeepSeek AI routing.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] transition-colors flex items-center justify-center border-0 cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {/* Agent Context Badge */}
          {selectedAgent && (
            <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] font-bold text-xs flex items-center justify-center shrink-0">
                  {selectedAgent.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#16281D] truncate">
                    {selectedAgent.user_name}
                  </div>
                  <div className="text-[11px] text-[#71717A] font-medium truncate">
                    {selectedAgent.user_email}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F8EE] text-[#059669] border border-[#BBF7D0] shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                Meta Cloud Ready
              </span>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl text-xs font-medium text-[#E11D48] flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-bold text-[#15803D] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#059669] shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Autonomous AI Notice */}
          <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl flex items-start gap-2.5 text-xs text-[#15803D] font-medium">
            <Sparkles size={16} className="shrink-0 mt-0.5 text-[#059669]" />
            <div className="leading-relaxed">
              <strong className="font-bold text-[#16281D]">Autonomous DeepSeek AI Core</strong>: Customer
              queries are responded to in real-time via the agent&apos;s allocated DeepSeek engine.
              Zero manual server webhooks required.
            </div>
          </div>

          <form id="whatsapp-setup-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* WhatsApp Phone Number */}
            <div>
              <label htmlFor="whatsapp_number" className="block text-xs font-bold text-[#16281D] uppercase tracking-wider mb-1.5">
                WhatsApp Phone Number <span className="text-[#E11D48]">*</span>
              </label>
              <input
                type="tel"
                id="whatsapp_number"
                name="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={handleInputChange}
                placeholder="+1 234 567 8900"
                required
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-sm font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
              />
              <p className="text-[11px] text-[#8FA89B] font-medium mt-1 m-0">
                Enter international E.164 phone format (e.g. +14155552671).
              </p>
            </div>

            {/* DeepSeek API Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="deepseek_api_key" className="block text-xs font-bold text-[#16281D] uppercase tracking-wider">
                  DeepSeek API Key
                </label>
                <span className="text-[10px] font-bold text-[#059669] bg-[#E8F8EE] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                  1 Key per Tenant
                </span>
              </div>
              <div className="relative">
                <input
                  type={showDeepSeekKey ? 'text' : 'password'}
                  id="deepseek_api_key"
                  name="deepseek_api_key"
                  value={formData.deepseek_api_key}
                  onChange={handleInputChange}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 pr-10 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-sm font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowDeepSeekKey(!showDeepSeekKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA89B] hover:text-[#16281D] border-0 bg-transparent cursor-pointer p-0.5"
                  aria-label={showDeepSeekKey ? 'Hide key' : 'Show key'}
                >
                  {showDeepSeekKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-[#8FA89B] font-medium mt-1 m-0">
                Dedicated key for autonomous multi-agent reasoning and smart customer service.
              </p>
            </div>

            {/* Meta Business API Credentials */}
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
                      value={formData.api_key}
                      onChange={handleInputChange}
                      placeholder="EAA..."
                      disabled={loading}
                      className="w-full px-3 py-2 pr-9 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-xs font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
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
                    value={formData.business_account_id}
                    onChange={handleInputChange}
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
                    value={formData.phone_number_id}
                    onChange={handleInputChange}
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
                      value={formData.whatsapp_app_secret}
                      onChange={handleInputChange}
                      placeholder="Meta App Secret"
                      disabled={loading}
                      className="w-full px-3 py-2 pr-9 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-xs font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAppSecret(!showAppSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8FA89B] hover:text-[#16281D] border-0 bg-transparent cursor-pointer p-0.5"
                      aria-label={showAppSecret ? 'Hide secret' : 'Show secret'}
                    >
                      {showAppSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Pinned Footer */}
        <div className="px-6 py-4 bg-[#FAFCFA] border-t border-[#EAEAEA] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-full text-xs font-bold text-[#52525B] bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="whatsapp-setup-form"
            disabled={loading || !selectedAgent}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-[#16281D] bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] shadow-[0_4px_14px_rgba(159,232,112,0.35)] transition-all cursor-pointer border-0 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving Credentials…</span>
              </>
            ) : (
              <>
                <MessageSquare size={14} strokeWidth={2.4} />
                <span>Commit WhatsApp Setup</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

