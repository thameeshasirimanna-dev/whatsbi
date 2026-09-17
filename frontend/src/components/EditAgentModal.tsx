import React, { useState, useEffect } from 'react';
import {
  X,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { getToken } from '../lib/auth';
import { BusinessTypeDropdown } from './admin/BusinessTypeDropdown';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  agentId: string;
  initialData: {
    agent_name: string;
    email: string;
    business_type?: 'product' | 'service';
  };
  supabaseUrl?: string;
  createdByUserId?: string;
}

interface AgentFormData {
  agent_name: string;
  email: string;
  business_type: 'product' | 'service';
  temp_password?: string;
}



const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

export const EditAgentModal: React.FC<EditAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  agentId,
  initialData,
  createdByUserId,
}) => {
  const [formData, setFormData] = useState<AgentFormData>({
    agent_name: initialData?.agent_name || '',
    email: initialData?.email || '',
    business_type: initialData?.business_type || 'product',
    temp_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');



  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        agent_name: initialData.agent_name,
        email: initialData.email,
        business_type: initialData.business_type || 'product',
        temp_password: '',
      });
      setError('');
    }
  }, [isOpen, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateForm = (data: AgentFormData): string[] => {
    const fieldErrors: string[] = [];
    if (!data.agent_name.trim()) fieldErrors.push('Agent Name is required');
    if (!data.email.trim()) fieldErrors.push('Email is required');
    else if (!EMAIL_REGEX.test(data.email)) fieldErrors.push('Invalid email format');
    if (!data.business_type) fieldErrors.push('Business type is required');
    if (data.temp_password && !PASSWORD_STRENGTH_REGEX.test(data.temp_password)) {
      fieldErrors.push('Password must be at least 8 chars with uppercase, lowercase, and number');
    }
    return fieldErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowSuccess(false);

    if (!createdByUserId) {
      setError('Admin user session not available. Please refresh and try again.');
      return;
    }

    const submitData: any = {
      agent_name: formData.agent_name,
      email: formData.email,
      business_type: formData.business_type,
      agent_id: agentId,
      updated_by: createdByUserId,
    };

    if (formData.temp_password && formData.temp_password.trim()) {
      submitData.temp_password = formData.temp_password;
    }

    const validationErrors = validateForm(submitData);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) {
        setError('User not authenticated. Please log in again.');
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${backendUrl}/update-agent`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('Agent profile updated successfully!');
        setShowSuccess(true);
        if (onSuccess) onSuccess();

        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError(data.message || 'Failed to update agent profile');
        console.error('Edge function failed:', data);
      }
    } catch (err: any) {
      console.error('Update agent error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !showSuccess) {
      setError('');
      setFormData({
        agent_name: initialData?.agent_name || '',
        email: initialData?.email || '',
        business_type: initialData?.business_type || 'product',
        temp_password: '',
      });
      setShowSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] border border-[#EAEAEA] shadow-[0_24px_72px_rgba(20,40,24,0.18)] max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {showSuccess ? (
          <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center mb-4 shadow-xs">
              <CheckCircle2 size={32} strokeWidth={2.4} />
            </div>
            <h3 className="text-xl font-bold text-[#16281D] tracking-tight mb-1">
              {successMessage}
            </h3>
            <p className="text-xs text-[#71717A] font-medium mb-5">
              Changes to this agent&apos;s credentials and profile have been committed.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-full text-xs font-bold text-[#16281D] bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0">
                  <Pencil size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#16281D] m-0 tracking-tight leading-snug">
                    Edit Agent Profile
                  </h3>
                  <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
                    Update profile information. WhatsApp credentials are managed separately.
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

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {error && (
                <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl text-xs font-medium text-[#E11D48] flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form id="edit-agent-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#16281D] uppercase tracking-wider mb-1.5">
                    Agent Name <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    type="text"
                    name="agent_name"
                    value={formData.agent_name}
                    onChange={handleInputChange}
                    placeholder="Enter agent name"
                    disabled={isLoading}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-xl text-sm font-medium text-[#16281D] placeholder-[#8FA89B] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 disabled:opacity-50"
                  />
                </div>

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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#16281D] uppercase tracking-wider">
                      New Password (Optional)
                    </label>
                    <span className="text-[11px] text-[#8FA89B] font-medium">
                      Leave empty to keep current
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="temp_password"
                      value={formData.temp_password || ''}
                      onChange={handleInputChange}
                      placeholder="Enter new password to reset"
                      disabled={isLoading}
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
                </div>
              </form>
            </div>

            {/* Footer */}
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
                form="edit-agent-modal-form"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-[#16281D] bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] shadow-[0_4px_14px_rgba(159,232,112,0.35)] transition-all cursor-pointer border-0 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving Changes…</span>
                  </>
                ) : (
                  <>
                    <Pencil size={13} strokeWidth={2.4} />
                    <span>Save Changes</span>
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

export default EditAgentModal;

