import React, { useState } from 'react';
import {
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { BusinessTypeDropdown } from './admin/BusinessTypeDropdown';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isEdit?: boolean;
  agentId?: string;
  initialData?: Partial<AgentFormData>;
  apiUrl?: string;
  createdByUserId?: string;
}

interface AgentFormData {
  agent_name: string;
  email: string;
  business_type: 'product' | 'service';
  temp_password: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

export const AddAgentModal: React.FC<AddAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isEdit = false,
  agentId,
  initialData = {},
  apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  createdByUserId,
}) => {
  const [formData, setFormData] = useState<AgentFormData>({
    agent_name: initialData.agent_name || '',
    email: initialData.email || '',
    business_type: (initialData as any).business_type || 'product',
    temp_password: initialData.temp_password || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);



  const generateTempPassword = (): string => {
    const length = Math.floor(Math.random() * 5) + 8;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateForm = (data: AgentFormData, editing: boolean): string[] => {
    const fieldErrors: string[] = [];
    if (!data.agent_name.trim()) fieldErrors.push('Agent Name is required');
    if (!data.email.trim()) fieldErrors.push('Email is required');
    else if (!EMAIL_REGEX.test(data.email)) fieldErrors.push('Invalid email format');
    if (!data.business_type) fieldErrors.push('Business type is required');
    if (!editing && !data.temp_password) {
      fieldErrors.push('Password is required for new agents');
    } else if (data.temp_password && !PASSWORD_STRENGTH_REGEX.test(data.temp_password)) {
      fieldErrors.push('Password must be at least 8 chars with uppercase, lowercase, and number');
    }
    return fieldErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowSuccess(false);

    const submitData: any = {
      agent_name: formData.agent_name,
      email: formData.email,
      business_type: formData.business_type,
      temp_password: formData.temp_password,
    };

    if (isEdit) {
      if (agentId) submitData.agent_id = agentId;
      if (!submitData.temp_password.trim()) delete submitData.temp_password;
    } else {
      if (createdByUserId) submitData.createdBy = createdByUserId;
      if (!submitData.temp_password.trim()) {
        const generated = generateTempPassword();
        submitData.temp_password = generated;
        setGeneratedPassword(generated);
      }
    }

    const validationErrors = validateForm(submitData, isEdit);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Please log in to continue');
        setIsLoading(false);
        return;
      }

      const endpoint = isEdit ? 'update-agent' : 'add-agent';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(`${apiUrl}/${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage(isEdit ? 'Agent updated successfully!' : 'Agent registered successfully!');

        if (isEdit) {
          setFormData({
            agent_name: initialData?.agent_name || '',
            email: initialData?.email || '',
            business_type: (initialData as any)?.business_type || 'product',
            temp_password: '',
          });
        } else {
          setFormData({ agent_name: '', email: '', business_type: 'product', temp_password: '' });
        }

        setShowSuccess(true);
        if (onSuccess) onSuccess();

        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 3000);
      } else {
        setError(data.message || `Failed to ${isEdit ? 'update' : 'register'} agent`);
        console.error('Edge function failed:', data);
      }
    } catch (err: any) {
      console.error(`${isEdit ? 'Update' : 'Register'} agent error:`, err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (!isLoading && !showSuccess) {
      setError('');
      if (isEdit) {
        setFormData({
          agent_name: initialData?.agent_name || '',
          email: initialData?.email || '',
          business_type: (initialData as any)?.business_type || 'product',
          temp_password: '',
        });
      } else {
        setFormData({ agent_name: '', email: '', business_type: 'product', temp_password: '' });
      }
      setGeneratedPassword('');
      setShowSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16281D]/65 font-sans animate-modal-backdrop">
      <div className="bg-white rounded-[28px] border border-[#EAEAEA] shadow-[0_24px_72px_rgba(20,40,24,0.18)] max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-modal-card">
        {showSuccess ? (
          <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center mb-4 shadow-xs">
              <CheckCircle2 size={32} strokeWidth={2.4} />
            </div>
            <h3 className="text-xl font-bold text-[#16281D] tracking-tight mb-1">
              {successMessage}
            </h3>
            <p className="text-xs text-[#71717A] font-medium mb-5">
              The agent account has been provisioned and is ready for WhatsApp routing.
            </p>

            {generatedPassword && (
              <div className="w-full bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl p-4 mb-4 text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669] uppercase tracking-wider">
                    <Key size={13} strokeWidth={2.4} />
                    <span>Auto-Generated Password</span>
                  </div>
                  <button
                    onClick={handleCopyPassword}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#16281D] hover:text-[#059669] bg-white border border-[#EAEAEA] hover:border-[#9FE870] px-2.5 py-1 rounded-full cursor-pointer transition-all shadow-2xs"
                  >
                    {copied ? <Check size={12} className="text-[#059669]" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 font-mono text-sm font-bold text-[#16281D] select-all break-all shadow-2xs">
                  {generatedPassword}
                </div>
                <p className="text-[11px] text-[#71717A] font-medium mt-2 m-0">
                  Please securely share this temporary password with the tenant agent.
                </p>
              </div>
            )}

            {!isEdit && (
              <div className="w-full p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs text-[#15803D] font-medium mb-5 text-left flex items-start gap-2">
                <Sparkles size={15} className="shrink-0 mt-0.5" />
                <span>
                  WhatsApp Cloud API credentials can be configured now or later from the WhatsApp Fleet tab.
                </span>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-full text-xs font-bold text-[#16281D] bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all"
            >
              Done & Return to Fleet
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0">
                  <UserPlus size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#16281D] m-0 tracking-tight leading-snug">
                    {isEdit ? 'Edit Agent Account' : 'Register New Agent'}
                  </h3>
                  <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
                    {isEdit
                      ? 'Update agent name, email, and security credentials'
                      : 'Provision a new multi-tenant instance and allocate system prefixes'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] transition-colors flex items-center justify-center border-0 cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {error && (
                <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl text-xs font-medium text-[#E11D48] flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form id="agent-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Agent Name */}
                <div>
                  <label className="block text-xs font-bold text-[#16281D] uppercase tracking-wider mb-1.5">
                    Agent Name <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    type="text"
                    name="agent_name"
                    value={formData.agent_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Acme Support Team"
                    disabled={isLoading}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-sm font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 disabled:opacity-50"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-[#16281D] uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="agent@company.com"
                    disabled={isLoading}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-sm font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-[#8FA89B] font-medium mt-1 m-0">
                    Used for login credentials, authentication, and platform alerts.
                  </p>
                </div>

                {/* Business Type Custom Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-[#16281D] uppercase tracking-wider mb-1.5">
                    Business Type <span className="text-[#E11D48]">*</span>
                  </label>
                  <BusinessTypeDropdown
                    value={formData.business_type}
                    onChange={(val) => setFormData((prev) => ({ ...prev, business_type: val }))}
                    disabled={isLoading}
                  />
                  <p className="text-[11px] text-[#8FA89B] font-medium mt-1.5 m-0">
                    Determines automated invoice templates, WhatsApp catalogs, and AI recommendation logic.
                  </p>
                </div>

                {/* Temporary / New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#16281D] uppercase tracking-wider">
                      {isEdit ? 'New Password (Optional)' : 'Temporary Password'}
                    </label>
                    {!isEdit && (
                      <span className="text-[11px] text-[#059669] font-bold">
                        Leave blank to auto-generate
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="temp_password"
                      value={formData.temp_password}
                      onChange={handleInputChange}
                      placeholder={
                        isEdit
                          ? 'Leave empty to keep current password'
                          : 'Auto-generated if left empty'
                      }
                      disabled={isLoading}
                      required={false}
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-sm font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 font-mono disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA89B] hover:text-[#16281D] border-0 bg-transparent cursor-pointer p-0.5"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#8FA89B] font-medium mt-1 m-0">
                    Min 8 characters, with uppercase, lowercase, and numeric digits.
                  </p>
                </div>
              </form>
            </div>

            {/* Pinned Footer */}
            <div className="px-6 py-4 bg-[#FAFCFA] border-t border-[#EAEAEA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#52525B] bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="agent-modal-form"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-[#16281D] bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] shadow-[0_4px_14px_rgba(159,232,112,0.35)] transition-all cursor-pointer border-0 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{isEdit ? 'Updating Agent…' : 'Registering Agent…'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={14} strokeWidth={2.4} />
                    <span>{isEdit ? 'Save Changes' : 'Register Agent'}</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddAgentModal;

