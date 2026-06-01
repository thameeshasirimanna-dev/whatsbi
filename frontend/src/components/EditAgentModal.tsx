import React, { useState, useEffect } from 'react';
import { X, Pencil, CheckCircle } from 'lucide-react';
import { getToken } from "../lib/auth";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  agentId: string;
  initialData: {
    agent_name: string;
    email: string;
    business_type?: "product" | "service";
  };
  supabaseUrl?: string;
  createdByUserId?: string;
}

interface AgentFormData {
  agent_name: string;
  email: string;
  business_type: "product" | "service";
  temp_password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

const EditAgentModal: React.FC<EditAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  agentId,
  initialData,
  supabaseUrl = 'https://itvaqysqzdmwhucllktz.supabase.co',
  createdByUserId,
}) => {
  const [formData, setFormData] = useState<AgentFormData>({
    agent_name: initialData.agent_name,
    email: initialData.email,
    business_type: initialData.business_type || "product",
    temp_password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        agent_name: initialData.agent_name,
        email: initialData.email,
        business_type: initialData.business_type || "product",
        temp_password: "",
      });
      setError('');
    }
  }, [isOpen, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (data: AgentFormData): string[] => {
    const fieldErrors: string[] = [];
    if (!data.agent_name.trim()) fieldErrors.push('Agent Name is required');
    if (!data.email.trim()) fieldErrors.push('Email is required');
    else if (!EMAIL_REGEX.test(data.email)) fieldErrors.push('Invalid email format');
    if (!data.business_type) fieldErrors.push("Business type is required");
    if (data.temp_password && !PASSWORD_STRENGTH_REGEX.test(data.temp_password)) {
      fieldErrors.push('Password must be at least 8 chars, with uppercase, lowercase, and number');
    }
    return fieldErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowSuccess(false);

    if (!createdByUserId) {
      setError('Admin user ID not available. Please refresh and try again.');
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
        setError("User not authenticated. Please log in again.");
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${backendUrl}/update-agent`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage("Agent updated successfully!");
        setShowSuccess(true);
        if (onSuccess) onSuccess();

        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError(data.message || "Failed to update agent");
        console.error("Edge function failed:", data);
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
      setFormData({ agent_name: initialData.agent_name, email: initialData.email, business_type: initialData.business_type || "product", temp_password: "" });
      setShowSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`@keyframes eam-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {showSuccess ? (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={28} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e', marginBottom: 8 }}>{successMessage}</div>
              <div style={{ ...DM, fontSize: 12, color: '#a1a1aa', marginBottom: 20 }}>Redirecting to agents list shortly…</div>
              <button onClick={handleClose} style={{ background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '10px 24px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          ) : (
            <>
              <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={15} style={{ color: '#22c55e' }} />
                  </div>
                  <div>
                    <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>Edit Agent</span>
                    <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>Update basic info. WhatsApp managed separately.</span>
                  </div>
                </div>
                <button onClick={handleClose} style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
                  <X size={15} style={{ color: '#71717a' }} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {error && (
                  <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Agent Name *</label>
                    <input type="text" name="agent_name" value={formData.agent_name} onChange={handleInputChange} placeholder="Enter agent full name" disabled={isLoading} required style={{ ...inputStyle, background: isLoading ? '#f4f4f5' : '#f9f9f9' }} onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Email Address *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="agent@example.com" disabled={isLoading} required style={{ ...inputStyle, background: isLoading ? '#f4f4f5' : '#f9f9f9' }} onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Business Type *</label>
                    <select name="business_type" value={formData.business_type} onChange={handleInputChange} disabled={isLoading} required style={{ ...inputStyle, background: isLoading ? '#f4f4f5' : '#f9f9f9', appearance: 'none', cursor: isLoading ? 'not-allowed' : 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="service">Service</option>
                      <option value="product">Product</option>
                    </select>
                    <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Select the type of business this agent manages</div>
                  </div>

                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>New Password (Optional)</label>
                    <input type="password" name="temp_password" value={formData.temp_password} onChange={handleInputChange} placeholder="Leave empty to keep current password" disabled={isLoading} style={{ ...inputStyle, background: isLoading ? '#f4f4f5' : '#f9f9f9' }} onFocus={onFocus} onBlur={onBlur} />
                    <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Leave empty to keep current password.</div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                    <button type="button" onClick={handleClose} disabled={isLoading} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={isLoading} style={{ flex: 1, background: isLoading ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow: isLoading ? 'none' : '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {isLoading ? (
                        <>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'eam-spin 0.7s linear infinite' }} />
                          Updating…
                        </>
                      ) : "Update Agent"}
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 12, textAlign: 'center', ...DM, fontSize: 11, color: '#a1a1aa' }}>
                    WhatsApp configuration is managed separately from agent basic information.
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export { EditAgentModal };
export default EditAgentModal;
