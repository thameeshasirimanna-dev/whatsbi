import React, { useState } from "react";
import { X, UserPlus, CheckCircle, Key } from "lucide-react";

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

const AddAgentModal: React.FC<AddAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isEdit = false,
  agentId,
  initialData = {},
  apiUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000",
  createdByUserId,
}) => {
  const [formData, setFormData] = useState<AgentFormData>({
    agent_name: initialData.agent_name || "",
    email: initialData.email || "",
    business_type: (initialData as any).business_type || "product",
    temp_password: initialData.temp_password || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  const generateTempPassword = (): string => {
    const length = Math.floor(Math.random() * 5) + 8;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&";
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (data: AgentFormData, editing: boolean): string[] => {
    const fieldErrors: string[] = [];
    if (!data.agent_name.trim()) fieldErrors.push("Agent Name is required");
    if (!data.email.trim()) fieldErrors.push("Email is required");
    else if (!EMAIL_REGEX.test(data.email)) fieldErrors.push("Invalid email format");
    if (!data.business_type) fieldErrors.push("Business type is required");
    if (!editing && !data.temp_password) {
      fieldErrors.push("Password is required for new agents");
    } else if (data.temp_password && !PASSWORD_STRENGTH_REGEX.test(data.temp_password)) {
      fieldErrors.push("Password must be at least 8 chars, with uppercase, lowercase, and number");
    }
    return fieldErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowSuccess(false);

    if (!createdByUserId) {
      setError("Admin user ID not available. Please refresh and try again.");
      return;
    }

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
      submitData.createdBy = createdByUserId;
      if (!submitData.temp_password.trim()) {
        const generated = generateTempPassword();
        submitData.temp_password = generated;
        setGeneratedPassword(generated);
      }
    }

    const validationErrors = validateForm(submitData, isEdit);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(", "));
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Please log in to continue");
        setIsLoading(false);
        return;
      }

      const endpoint = isEdit ? "update-agent" : "add-agent";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(`${apiUrl}/${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage(isEdit ? "Agent updated successfully!" : "Agent added successfully!");

        if (isEdit) {
          setFormData({ agent_name: initialData?.agent_name || "", email: initialData?.email || "", business_type: (initialData as any)?.business_type || "product", temp_password: "" });
        } else {
          setFormData({ agent_name: "", email: "", business_type: "product", temp_password: "" });
        }

        setShowSuccess(true);
        if (onSuccess) onSuccess();

        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 3000);
      } else {
        setError(data.message || `Failed to ${isEdit ? "update" : "add"} agent`);
        console.error("Edge function failed:", data);
      }
    } catch (err: any) {
      console.error(`${isEdit ? "Update" : "Add"} agent error:`, err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !showSuccess) {
      setError("");
      if (isEdit) {
        setFormData({ agent_name: initialData?.agent_name || "", email: initialData?.email || "", business_type: (initialData as any)?.business_type || "product", temp_password: "" });
      } else {
        setFormData({ agent_name: "", email: "", business_type: "product", temp_password: "" });
      }
      setGeneratedPassword("");
      setShowSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`@keyframes aam-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {showSuccess ? (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={28} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e', marginBottom: 8 }}>{successMessage}</div>

              {generatedPassword && (
                <div style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 12, padding: '14px 16px', margin: '16px 0', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Key size={14} style={{ color: '#22c55e' }} />
                    <span style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Generated Password</span>
                  </div>
                  <code style={{ ...DM, fontSize: 15, fontWeight: 600, color: '#0c1a0e', background: '#fff', border: '1px solid #ebebeb', padding: '6px 10px', borderRadius: 7, display: 'block', wordBreak: 'break-all' }}>
                    {generatedPassword}
                  </code>
                  <div style={{ ...DM, fontSize: 11, color: '#71717a', marginTop: 8 }}>Share this with the agent securely</div>
                </div>
              )}

              {!isEdit && (
                <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, ...DM, fontSize: 12, color: '#059669', textAlign: 'left' }}>
                  WhatsApp configuration can be set up separately from the agent dashboard.
                </div>
              )}

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
                    <UserPlus size={16} style={{ color: '#22c55e' }} />
                  </div>
                  <div>
                    <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>{isEdit ? "Edit Agent" : "Add New Agent"}</span>
                    {!isEdit && <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>WhatsApp config can be set up separately</span>}
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
                    <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Select the type of business this agent will manage</div>
                  </div>

                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
                      {isEdit ? "New Password (Optional)" : "Temporary Password *"}
                    </label>
                    <input
                      type="password"
                      name="temp_password"
                      value={formData.temp_password}
                      onChange={handleInputChange}
                      placeholder={isEdit ? "Leave empty to keep current password" : "Leave empty to auto-generate secure password"}
                      disabled={isLoading}
                      required={!isEdit}
                      style={{ ...inputStyle, background: isLoading ? '#f4f4f5' : '#f9f9f9' }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                    {!isEdit && <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Leave empty to automatically generate a secure password</div>}
                  </div>

                  <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                    <button type="button" onClick={handleClose} disabled={isLoading} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={isLoading} style={{ flex: 1, background: isLoading ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow: isLoading ? 'none' : '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {isLoading ? (
                        <>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'aam-spin 0.7s linear infinite' }} />
                          {isEdit ? "Updating…" : "Creating…"}
                        </>
                      ) : (isEdit ? "Update Agent" : "Create Agent")}
                    </button>
                  </div>

                  {!isEdit && (
                    <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 12, textAlign: 'center', ...DM, fontSize: 11, color: '#a1a1aa' }}>
                      WhatsApp configuration can be set up separately after agent creation.
                    </div>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export { AddAgentModal };
export default AddAgentModal;
