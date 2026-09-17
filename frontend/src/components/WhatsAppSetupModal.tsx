import React, { useState } from 'react';
import { X, MessageSquare, CheckCircle, Bot, Eye, EyeOff } from 'lucide-react';

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

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const onFocusInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlurInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

export const WhatsAppSetupModal: React.FC<WhatsAppSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedAgent,
  initialConfig,
}) => {
  const getToken = () => localStorage.getItem('auth_token');

  const [formData, setFormData] = useState<WhatsAppConfig>({
    whatsapp_number: "",
    webhook_url: "",
    api_key: "",
    business_account_id: "",
    phone_number_id: "",
    whatsapp_app_secret: "",
    deepseek_api_key: "",
  });
  const [showDeepSeekKey, setShowDeepSeekKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialConfig) {
      setFormData({
        whatsapp_number: initialConfig.whatsapp_number || "",
        webhook_url: initialConfig.webhook_url || "",
        api_key: initialConfig.api_key || "",
        business_account_id: initialConfig.business_account_id || "",
        phone_number_id: initialConfig.phone_number_id || "",
        whatsapp_app_secret: initialConfig.whatsapp_app_secret || "",
        deepseek_api_key: initialConfig.deepseek_api_key || "",
      });
    } else {
      setFormData({
        whatsapp_number: "",
        webhook_url: "",
        api_key: "",
        business_account_id: "",
        phone_number_id: "",
        whatsapp_app_secret: "",
        deepseek_api_key: "",
      });
    }
  }, [initialConfig]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.whatsapp_number.trim()) { setError('WhatsApp number is required'); return false; }
    const whatsappRegex = /^\+?[1-9]\d{1,14}$/;
    if (!whatsappRegex.test(formData.whatsapp_number.replace(/\D/g, ''))) {
      setError('Please enter a valid WhatsApp number (international format)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;
    if (!selectedAgent) { setError('No agent selected for WhatsApp setup'); return; }

    setLoading(true);

    try {
      const payload = {
        user_id: selectedAgent.user_id,
        whatsapp_number: formData.whatsapp_number.trim(),
        webhook_url: "",
        api_key: formData.api_key?.trim() || null,
        business_account_id: formData.business_account_id?.trim() || null,
        phone_number_id: formData.phone_number_id?.trim() || null,
        whatsapp_app_secret: formData.whatsapp_app_secret?.trim() || null,
        deepseek_api_key: formData.deepseek_api_key?.trim() || null,
      };

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/setup-whatsapp-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(`Failed to setup WhatsApp: ${data.message || 'Unknown error'}`);
      if (!data.success) throw new Error(data.message || 'Failed to setup WhatsApp configuration');

      setSuccessMessage('WhatsApp configuration set up successfully!');
      onSuccess();
      setFormData({
        whatsapp_number: initialConfig?.whatsapp_number || "",
        webhook_url: initialConfig?.webhook_url || "",
        api_key: initialConfig?.api_key || "",
        business_account_id: initialConfig?.business_account_id || "",
        phone_number_id: initialConfig?.phone_number_id || "",
        whatsapp_app_secret: initialConfig?.whatsapp_app_secret || "",
        deepseek_api_key: initialConfig?.deepseek_api_key || "",
      });

      setTimeout(() => { onClose(); }, 2000);
    } catch (err: any) {
      console.error('WhatsApp setup error:', err);
      setError(err.message || 'Failed to setup WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    setFormData({
      whatsapp_number: initialConfig?.whatsapp_number || "",
      webhook_url: initialConfig?.webhook_url || "",
      api_key: initialConfig?.api_key || "",
      business_account_id: initialConfig?.business_account_id || "",
      phone_number_id: initialConfig?.phone_number_id || "",
      whatsapp_app_secret: initialConfig?.whatsapp_app_secret || "",
      deepseek_api_key: initialConfig?.deepseek_api_key || "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`@keyframes wsm-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={16} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>
                  {selectedAgent ? `WhatsApp Setup — ${selectedAgent.user_name}` : "Setup WhatsApp"}
                </span>
                <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>Configure WhatsApp Business API credentials</span>
              </div>
            </div>
            <button onClick={handleClose} style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
              <X size={15} style={{ color: '#71717a' }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

            {selectedAgent && (
              <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {selectedAgent.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{selectedAgent.user_name}</div>
                  <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>{selectedAgent.user_email}</div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e', marginBottom: 16 }}>
                {error}
              </div>
            )}

            {successMessage && (
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9, ...DM, fontSize: 13, color: '#059669', marginBottom: 16 }}>
                <CheckCircle size={14} />
                {successMessage}
              </div>
            )}

            <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, marginBottom: 16 }}>
              <Bot size={16} color="#15803d" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ ...DM, fontSize: 12, color: '#15803d', lineHeight: 1.45 }}>
                <span style={{ fontWeight: 700 }}>Autonomous AI Engine Active</span>: Customer queries are handled directly via each agent&apos;s assigned DeepSeek API key. No external webhooks required.
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label htmlFor="whatsapp_number" style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
                  WhatsApp Number <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input type="tel" id="whatsapp_number" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleInputChange} placeholder="+1234567890" required style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
                <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Enter international format (e.g. +1 234 567 8900)</div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label htmlFor="deepseek_api_key" style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46' }}>
                    DeepSeek API Key
                  </label>
                  <span style={{ ...DM, fontSize: 11, color: '#059669', fontWeight: 600, background: 'rgba(34,197,94,0.08)', padding: '2px 8px', borderRadius: 12 }}>
                    1 API Key Per Agent
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showDeepSeekKey ? 'text' : 'password'}
                    id="deepseek_api_key"
                    name="deepseek_api_key"
                    value={formData.deepseek_api_key}
                    onChange={handleInputChange}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    style={{
                      ...inputStyle,
                      paddingRight: 40,
                      fontFamily: showDeepSeekKey ? 'monospace' : "'DM Sans', sans-serif",
                      letterSpacing: showDeepSeekKey ? '0.04em' : 'normal',
                    }}
                    onFocus={onFocusInput}
                    onBlur={onBlurInput}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeepSeekKey(!showDeepSeekKey)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#71717a',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 2,
                    }}
                    title={showDeepSeekKey ? 'Hide key' : 'Show key'}
                  >
                    {showDeepSeekKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div style={{ ...DM, fontSize: 11, color: '#71717a', marginTop: 4 }}>
                  Dedicated DeepSeek API key for this agent&apos;s autonomous WhatsApp chatbot responses.
                </div>
              </div>

              {/* Optional credentials section */}
              <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e', marginBottom: 4 }}>Business API Credentials</div>
                  <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>Optional — stored securely. Can be added later.</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="api_key" style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>API Key</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        id="api_key"
                        name="api_key"
                        value={formData.api_key}
                        onChange={handleInputChange}
                        placeholder="WhatsApp Business API key"
                        style={{ ...inputStyle, paddingRight: 38 }}
                        onFocus={onFocusInput}
                        onBlur={onBlurInput}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', display: 'flex', alignItems: 'center', padding: 2 }}
                        title={showApiKey ? 'Hide key' : 'Show key'}
                      >
                        {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="business_account_id" style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Business Account ID</label>
                    <input type="text" id="business_account_id" name="business_account_id" value={formData.business_account_id} onChange={handleInputChange} placeholder="Your WhatsApp Business Account ID" style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="phone_number_id" style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Phone Number ID</label>
                    <input type="text" id="phone_number_id" name="phone_number_id" value={formData.phone_number_id} onChange={handleInputChange} placeholder="Your WhatsApp Phone Number ID" style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="whatsapp_app_secret" style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>WhatsApp App Secret</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showAppSecret ? 'text' : 'password'}
                        id="whatsapp_app_secret"
                        name="whatsapp_app_secret"
                        value={formData.whatsapp_app_secret}
                        onChange={handleInputChange}
                        placeholder="WhatsApp App Secret from Meta Developer Console"
                        style={{ ...inputStyle, paddingRight: 38 }}
                        onFocus={onFocusInput}
                        onBlur={onBlurInput}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAppSecret(!showAppSecret)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', display: 'flex', alignItems: 'center', padding: 2 }}
                        title={showAppSecret ? 'Hide secret' : 'Show secret'}
                      >
                        {showAppSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #ebebeb', background: '#fafafa', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleClose} disabled={loading} style={{ background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading || !selectedAgent} style={{ background: (loading || !selectedAgent) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: (loading || !selectedAgent) ? 'not-allowed' : 'pointer', boxShadow: (loading || !selectedAgent) ? 'none' : '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading ? (
                <>
                  <div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'wsm-spin 0.7s linear infinite' }} />
                  Setting up…
                </>
              ) : "Setup WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
