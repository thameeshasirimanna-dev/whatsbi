import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import { Eye, EyeOff, User, Lock, Building2, FileText, Coins, Upload, X } from 'lucide-react';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#f9f9f9',
  border: '1px solid #ebebeb', borderRadius: 9, outline: 'none',
  ...DM, fontSize: 14, color: '#0c1a0e', boxSizing: 'border-box',
};

const onFocusG = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.08)';
  e.currentTarget.style.background = '#fff';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = '#f9f9f9';
};

const saveBtn: React.CSSProperties = {
  flex: 1, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
  color: '#fff', border: 'none', borderRadius: 9, padding: '8px 12px',
  ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const cancelBtn: React.CSSProperties = {
  flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46',
  border: 'none', borderRadius: 9, padding: '8px 12px',
  ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const editBtn: React.CSSProperties = {
  background: 'rgba(34,197,94,0.08)', color: '#059669',
  border: 'none', borderRadius: 7, padding: '5px 12px',
  ...DM, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
};

interface EditableFieldProps {
  label: string;
  value: string;
  editing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onEditStart: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  isLast?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  label, value, editing, editValue, onEditChange, onEditStart, onSave, onCancel,
  type = 'text', placeholder, readOnly = false, isLast = false,
}) => (
  <div style={{ padding: '14px 0', borderBottom: isLast ? 'none' : '1px solid #f4f4f5' }}>
    <div style={{ ...DM, fontSize: 12, color: '#71717a', marginBottom: 5 }}>{label}</div>
    {editing ? (
      <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type={type}
          value={editValue}
          onChange={e => onEditChange(e.target.value)}
          style={inputStyle}
          onFocus={onFocusG}
          onBlur={onBlurG}
          placeholder={placeholder}
          required
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" style={saveBtn}>Save</button>
          <button type="button" onClick={onCancel} style={cancelBtn}>Cancel</button>
        </div>
      </form>
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ ...DM, fontSize: 14, color: value ? '#0c1a0e' : '#a1a1aa' }}>{value || 'Not set'}</span>
        {!readOnly && <button onClick={onEditStart} style={editBtn}>Edit</button>}
      </div>
    )}
  </div>
);

const StatusMessage: React.FC<{ msg: string }> = ({ msg }) => {
  if (!msg) return null;
  const ok = msg.toLowerCase().includes('success');
  return (
    <div style={{ padding: '10px 14px', borderRadius: 9, marginTop: 12, ...DM, fontSize: 13,
      background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)',
      color: ok ? '#059669' : '#f43f5e',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)'}`,
    }}>
      {msg}
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, border: '1px solid #ebebeb',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 24,
};

const sectionIcon = (bg: string, color: string, icon: React.ReactNode) => (
  <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
    {icon}
  </div>
);

const SettingsContent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [agent, setAgent] = useState<{
    id: number; name: string; whatsapp_number: string;
    address?: string; business_email?: string; contact_number?: string;
    website?: string; invoice_template_path?: string; credits?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [editingBusinessEmail, setEditingBusinessEmail] = useState(false);
  const [newBusinessEmail, setNewBusinessEmail] = useState("");
  const [editingContactNumber, setEditingContactNumber] = useState(false);
  const [newContactNumber, setNewContactNumber] = useState("");
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [newWebsite, setNewWebsite] = useState("");
  const [editingCredits, setEditingCredits] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [creditsMessage, setCreditsMessage] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) { setError("User not authenticated"); return; }
        const response = await fetch(`${backendUrl}/get-agent-profile`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (!response.ok) { setError(data.message || "Failed to fetch agent profile"); return; }
        const agentData = data.agent;
        setUser({ id: agentData.id, email: agentData.email });
        setAgent({ ...agentData, credits: parseFloat(agentData.credits) || 0 });
        setNewName(agentData.name);
        setNewAddress(agentData.address || "");
        setNewBusinessEmail(agentData.business_email || "");
        setNewContactNumber(agentData.contact_number || "");
        setNewWebsite(agentData.website || "");
        setCurrentTemplate(agentData.invoice_template_path || null);
      } catch (err) {
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage(""); setError(null);
    if (!agent || !user) { setUpdateMessage("Error: Agent data not loaded"); return; }
    if (newName.trim().length < 2) { setUpdateMessage("Name must be at least 2 characters"); return; }
    try {
      const token = getToken();
      if (!token) { setUpdateMessage("Authentication required"); return; }
      const response = await fetch(`${backendUrl}/update-agent-details`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id, user_updates: { name: newName.trim() }, agent_updates: {} }),
      });
      const data = await response.json();
      if (!response.ok) { setUpdateMessage(`Error: ${data.message || "Update failed"}`); }
      else if (data.success) { setAgent({ ...agent, name: newName.trim() }); setUpdateMessage("Name updated successfully!"); setEditingName(false); }
      else { setUpdateMessage(data.message || "Update failed"); }
    } catch { setUpdateMessage("Failed to update name"); }
  };

  const handleAgentDetailUpdate = async (
    field: "address" | "business_email" | "contact_number" | "website", value: string
  ) => {
    setUpdateMessage(""); setError(null);
    if (!agent || !user) { setUpdateMessage("Error: Agent data not loaded"); return; }
    if (value.trim().length === 0) { setUpdateMessage("Field cannot be empty"); return; }
    if (field === "business_email" && !value.includes("@")) { setUpdateMessage("Please enter a valid email"); return; }
    if (field === "contact_number" && !/^\+?[\d\s-()]{10,}$/.test(value)) { setUpdateMessage("Please enter a valid contact number"); return; }
    if (field === "website" && !/^https?:\/\/.+/.test(value)) { setUpdateMessage("Please enter a valid website URL starting with http:// or https://"); return; }
    const updates: any = {};
    updates[field] = value.trim();
    try {
      const token = getToken();
      if (!token) { setUpdateMessage("Authentication required"); return; }
      const response = await fetch(`${backendUrl}/update-agent-details`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id, user_updates: {}, agent_updates: updates }),
      });
      const data = await response.json();
      if (!response.ok) { setUpdateMessage(`Error: ${data.message || "Update failed"}`); }
      else if (data.success) {
        setAgent({ ...agent, [field]: value.trim() });
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ");
        setUpdateMessage(`${fieldName} updated successfully!`);
        if (field === "address") setEditingAddress(false);
        if (field === "business_email") setEditingBusinessEmail(false);
        if (field === "contact_number") setEditingContactNumber(false);
        if (field === "website") setEditingWebsite(false);
      } else { setUpdateMessage(data.message || "Update failed"); }
    } catch { setUpdateMessage(`Failed to update ${field}`); }
  };

  const handleAddCredits = async () => {
    if (!agent || !user) { setCreditsMessage("Error: Agent data not loaded"); return; }
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) { setCreditsMessage("Please enter a valid positive amount"); return; }
    try {
      setCreditsMessage("");
      const token = getToken();
      if (!token) { setCreditsMessage("Please log in to continue"); return; }
      const response = await fetch(`${backendUrl}/add-credits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id, amount }),
      });
      const data = await response.json();
      if (response.ok && data.message === "Credits added successfully") {
        setAgent({ ...agent, credits: parseFloat(data.credits) });
        setCreditsMessage(`Added ${amount} credits successfully! New balance: ${data.credits}`);
        setNewAmount(""); setEditingCredits(false);
      } else { setCreditsMessage(data?.error || "Failed to add credits"); }
    } catch (err: any) { setCreditsMessage(`Failed to add credits: ${err.message}`); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true); setPasswordMessage(""); setError(null);
    if (newPassword !== confirmPassword) { setPasswordMessage("New passwords do not match"); setChangingPassword(false); return; }
    if (newPassword.length < 8) { setPasswordMessage("New password must be at least 8 characters"); setChangingPassword(false); return; }
    try {
      const token = getToken();
      if (!token) { setPasswordMessage("Please log in to continue"); setChangingPassword(false); return; }
      const response = await fetch(`${backendUrl}/update-password`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) { setPasswordMessage(data.message || "Failed to update password"); }
      else { setPasswordMessage("Password updated successfully!"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    } catch (err: any) { setPasswordMessage(`Failed to update password: ${err.message}`); }
    finally { setChangingPassword(false); }
  };

  const handleTemplateUpload = async () => {
    if (!selectedFile || !agent || !user) { setUpdateMessage("Error: File or agent data not available"); return; }
    const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !["png", "jpg", "jpeg"].includes(fileExt)) { setUpdateMessage("Please select a valid image file (PNG, JPG, JPEG)"); return; }
    const fileName = `invoice-template.${fileExt}`;
    const filePath = `agents/${agent.id}/${fileName}`;
    try {
      setUpdateMessage("");
      const token = getToken();
      if (!token) { setUpdateMessage("Authentication required"); return; }
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => { reader.onload = () => resolve(reader.result); reader.readAsDataURL(selectedFile); });
      const fileBase64 = (base64 as string).split(",")[1];
      const fileType = selectedFile.type;
      const fName = selectedFile.name;
      const response = await fetch(`${backendUrl}/upload-invoice-template`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id.toString(), file: { fileName: fName, fileBase64, fileType } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      if (data && data.success) {
        setAgent({ ...agent, invoice_template_path: filePath });
        setCurrentTemplate(filePath); setSelectedFile(null); setEditingTemplate(false);
        setUpdateMessage("Invoice template uploaded successfully!");
      } else { setUpdateMessage("Upload failed: " + (data?.error || "Unknown error")); }
    } catch (err: any) { setUpdateMessage(`Upload failed: ${err.message}`); }
  };

  const handleTemplateRemove = async () => {
    if (!currentTemplate || !agent) return;
    try {
      const token = getToken();
      if (!token) { setUpdateMessage("Authentication required"); return; }
      const response = await fetch(`${backendUrl}/update-agent-template-path`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id, template_path: null }),
      });
      const data = await response.json();
      if (!response.ok) { setUpdateMessage(`Error: ${data.message || "Removal failed"}`); }
      else if (data.success) { setAgent({ ...agent, invoice_template_path: undefined }); setUpdateMessage("Invoice template removed successfully!"); setCurrentTemplate(null); }
      else { setUpdateMessage(data.message || "Removal failed"); }
    } catch (err: any) { setUpdateMessage(`Removal failed: ${err.message}`); }
  };

  const handleDocumentUpload = async () => {
    if (!selectedDocumentFile || !agent || !user) { setUpdateMessage("Error: File or agent data not available"); return; }
    const filePath = `${agent.id}/document.txt`;
    try {
      setUpdateMessage("");
      const formData = new FormData();
      formData.append("agentId", agent.id.toString());
      formData.append("file", selectedDocumentFile);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-company-overview`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      if (data && data.success) {
        setCurrentDocument(filePath); setSelectedDocumentFile(null); setEditingDocument(false);
        setUpdateMessage("Company overview document uploaded successfully!");
      } else { setUpdateMessage("Upload failed: " + (data?.error || "Unknown error")); }
    } catch (err: any) { setUpdateMessage(`Upload failed: ${err.message}`); }
  };

  const handleDocumentRemove = async () => {
    if (!currentDocument || !agent) return;
    setCurrentDocument(null);
    setUpdateMessage("Company overview document removed successfully!");
  };

  const handleDownloadMarginGuide = async () => {
    try {
      const response = await fetch(`${backendUrl}/get-invoice-template`);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "IDesign_Invoice_Template.png";
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch {
      const fallbackLink = document.createElement("a");
      fallbackLink.href = `${backendUrl}/get-invoice-template`;
      fallbackLink.download = "IDesign_Invoice_Template.png";
      document.body.appendChild(fallbackLink); fallbackLink.click();
      document.body.removeChild(fallbackLink);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 320 }}>
        <style>{`@keyframes st-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(34,197,94,0.15)', borderTopColor: '#22c55e', animation: 'st-spin 0.8s linear infinite' }} />
          <span style={{ ...DM, fontSize: 13, color: '#71717a' }}>Loading settings…</span>
        </div>
      </div>
    );
  }

  const pwInputWrap: React.CSSProperties = { position: 'relative' };
  const pwToggle: React.CSSProperties = {
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: 0, display: 'flex',
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes st-spin { to { transform: rotate(360deg); } }`}</style>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Account Information */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #ebebeb' }}>
            {sectionIcon('rgba(34,197,94,0.1)', '#059669', <User size={15} />)}
            <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Account Information</span>
          </div>

          {error && <StatusMessage msg={error} />}
          {updateMessage && <StatusMessage msg={updateMessage} />}

          {user && agent ? (
            <div>
              <EditableField
                label="Name" value={agent.name} editing={editingName}
                editValue={newName} onEditChange={setNewName}
                onEditStart={() => { setEditingName(true); setUpdateMessage(""); }}
                onSave={handleNameUpdate}
                onCancel={() => { setEditingName(false); setNewName(agent.name); setUpdateMessage(""); }}
                placeholder="Enter your name"
              />
              <EditableField
                label="Email" value={user.email} editing={false}
                editValue="" onEditChange={() => {}} onEditStart={() => {}} onSave={() => {}} onCancel={() => {}}
                readOnly
              />
              <EditableField
                label="WhatsApp Number" value={agent.whatsapp_number || ''} editing={false}
                editValue="" onEditChange={() => {}} onEditStart={() => {}} onSave={() => {}} onCancel={() => {}}
                readOnly
              />
              <EditableField
                label="Address" value={agent.address || ''} editing={editingAddress}
                editValue={newAddress} onEditChange={setNewAddress}
                onEditStart={() => { setEditingAddress(true); setUpdateMessage(""); }}
                onSave={e => { e.preventDefault(); handleAgentDetailUpdate("address", newAddress); }}
                onCancel={() => { setEditingAddress(false); setNewAddress(agent?.address || ""); setUpdateMessage(""); }}
                placeholder="Enter your address"
              />
              <EditableField
                label="Business Email" value={agent.business_email || ''} editing={editingBusinessEmail}
                editValue={newBusinessEmail} onEditChange={setNewBusinessEmail}
                onEditStart={() => { setEditingBusinessEmail(true); setUpdateMessage(""); }}
                onSave={e => { e.preventDefault(); handleAgentDetailUpdate("business_email", newBusinessEmail); }}
                onCancel={() => { setEditingBusinessEmail(false); setNewBusinessEmail(agent?.business_email || ""); setUpdateMessage(""); }}
                type="email" placeholder="Enter business email"
              />
              <EditableField
                label="Contact Number" value={agent.contact_number || ''} editing={editingContactNumber}
                editValue={newContactNumber} onEditChange={setNewContactNumber}
                onEditStart={() => { setEditingContactNumber(true); setUpdateMessage(""); }}
                onSave={e => { e.preventDefault(); handleAgentDetailUpdate("contact_number", newContactNumber); }}
                onCancel={() => { setEditingContactNumber(false); setNewContactNumber(agent?.contact_number || ""); setUpdateMessage(""); }}
                type="tel" placeholder="Enter contact number"
              />
              <EditableField
                label="Website" value={agent.website || ''} editing={editingWebsite}
                editValue={newWebsite} onEditChange={setNewWebsite}
                onEditStart={() => { setEditingWebsite(true); setUpdateMessage(""); }}
                onSave={e => { e.preventDefault(); handleAgentDetailUpdate("website", newWebsite); }}
                onCancel={() => { setEditingWebsite(false); setNewWebsite(agent?.website || ""); setUpdateMessage(""); }}
                type="url" placeholder="Enter website URL (e.g., https://example.com)"
              />

              {/* Credits */}
              <div style={{ padding: '14px 0', borderBottom: '1px solid #f4f4f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <Coins size={12} style={{ color: '#71717a' }} />
                  <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>Credits Balance</span>
                </div>
                {editingCredits ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="number" step="0.01" min="0.01" value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      style={inputStyle} onFocus={onFocusG} onBlur={onBlurG}
                      placeholder="Enter amount to add (e.g., 10.00)" required
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button" onClick={handleAddCredits}
                        disabled={!newAmount || parseFloat(newAmount) <= 0}
                        style={{ ...saveBtn, opacity: (!newAmount || parseFloat(newAmount) <= 0) ? 0.5 : 1 }}
                      >
                        Add Credits
                      </button>
                      <button type="button" onClick={() => { setEditingCredits(false); setNewAmount(""); setCreditsMessage(""); }} style={cancelBtn}>
                        Cancel
                      </button>
                    </div>
                    <StatusMessage msg={creditsMessage} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ ...DM, fontSize: 14, fontWeight: 600, color: '#0c1a0e' }}>
                      {agent?.credits ? `${agent.credits.toFixed(2)} credits` : "0.00 credits"}
                    </span>
                    <button onClick={() => { setEditingCredits(true); setCreditsMessage(""); }} style={editBtn}>
                      Add Credits
                    </button>
                  </div>
                )}
              </div>

              {/* Invoice Template */}
              <div style={{ padding: '14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <FileText size={12} style={{ color: '#71717a' }} />
                  <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>Invoice Template</span>
                </div>
                {editingTemplate ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f9f9f9', border: '1px dashed #d4d4d8', borderRadius: 9, cursor: 'pointer' }}>
                      <Upload size={14} style={{ color: '#71717a' }} />
                      <span style={{ ...DM, fontSize: 13, color: selectedFile ? '#0c1a0e' : '#71717a' }}>
                        {selectedFile ? selectedFile.name : 'Choose file (PNG, JPG, JPEG)'}
                      </span>
                      <input type="file" accept=".png,.jpg,.jpeg" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={handleTemplateUpload} disabled={!selectedFile} style={{ ...saveBtn, opacity: !selectedFile ? 0.5 : 1 }}>
                        Upload
                      </button>
                      <button type="button" onClick={() => { setEditingTemplate(false); setSelectedFile(null); setUpdateMessage(""); }} style={cancelBtn}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ ...DM, fontSize: 14, color: currentTemplate ? '#0c1a0e' : '#a1a1aa' }}>
                      {currentTemplate ? 'Template uploaded' : 'No template set'}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {currentTemplate && (
                        <>
                          <button onClick={() => setEditingTemplate(true)} style={editBtn}>Change</button>
                          <button onClick={handleTemplateRemove} style={{ ...editBtn, background: 'rgba(244,63,94,0.08)', color: '#f43f5e' }}>Remove</button>
                        </>
                      )}
                      {!currentTemplate && (
                        <button onClick={() => setEditingTemplate(true)} style={editBtn}>Upload</button>
                      )}
                      <button onClick={handleDownloadMarginGuide} style={{ ...editBtn, background: 'rgba(34,197,94,0.08)', color: '#059669' }}>
                        Margin Guide
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ ...DM, fontSize: 14, color: '#71717a' }}>Unable to load account information</p>
          )}
        </div>

        {/* Change Password */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #ebebeb' }}>
            {sectionIcon('rgba(8,145,178,0.1)', '#0891b2', <Lock size={15} />)}
            <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Change Password</span>
          </div>

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current Password */}
            <div>
              <div style={{ ...DM, fontSize: 12, color: '#71717a', marginBottom: 5 }}>Current Password</div>
              <div style={pwInputWrap}>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 36 }}
                  onFocus={onFocusG} onBlur={onBlurG}
                  placeholder="Enter current password" required
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={pwToggle}>
                  {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <div style={{ ...DM, fontSize: 12, color: '#71717a', marginBottom: 5 }}>New Password</div>
              <div style={pwInputWrap}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 36 }}
                  onFocus={onFocusG} onBlur={onBlurG}
                  placeholder="Enter new password (min 8 characters)" required
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={pwToggle}>
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div style={{ ...DM, fontSize: 12, color: '#71717a', marginBottom: 5 }}>Confirm New Password</div>
              <div style={pwInputWrap}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 36 }}
                  onFocus={onFocusG} onBlur={onBlurG}
                  placeholder="Confirm new password" required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={pwToggle}>
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <StatusMessage msg={passwordMessage} />

            <button
              type="submit" disabled={changingPassword}
              style={{ ...saveBtn, flex: 'none', width: '100%', padding: '11px 0', fontSize: 14, opacity: changingPassword ? 0.6 : 1 }}
            >
              {changingPassword ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      {/* Company Overview */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #ebebeb' }}>
          {sectionIcon('rgba(79,70,229,0.1)', '#4f46e5', <Building2 size={15} />)}
          <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Company Overview Document</span>
        </div>

        <div style={{ ...DM, fontSize: 12, color: '#71717a', marginBottom: 8 }}>Document</div>
        {editingDocument ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f9f9f9', border: '1px dashed #d4d4d8', borderRadius: 9, cursor: 'pointer' }}>
              <Upload size={14} style={{ color: '#71717a' }} />
              <span style={{ ...DM, fontSize: 13, color: selectedDocumentFile ? '#0c1a0e' : '#71717a' }}>
                {selectedDocumentFile ? selectedDocumentFile.name : 'Choose file (.txt, .pdf, .doc, .docx)'}
              </span>
              <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={e => setSelectedDocumentFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </label>
            <div style={{ display: 'flex', gap: 8, maxWidth: 320 }}>
              <button type="button" onClick={handleDocumentUpload} disabled={!selectedDocumentFile} style={{ ...saveBtn, opacity: !selectedDocumentFile ? 0.5 : 1 }}>
                Upload
              </button>
              <button type="button" onClick={() => { setEditingDocument(false); setSelectedDocumentFile(null); setUpdateMessage(""); }} style={cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ ...DM, fontSize: 14, color: currentDocument ? '#0c1a0e' : '#a1a1aa' }}>
              {currentDocument ? 'Document uploaded' : 'No document set'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {currentDocument ? (
                <>
                  <button onClick={() => setEditingDocument(true)} style={editBtn}>Change</button>
                  <button onClick={handleDocumentRemove} style={{ ...editBtn, background: 'rgba(244,63,94,0.08)', color: '#f43f5e' }}>Remove</button>
                </>
              ) : (
                <button onClick={() => setEditingDocument(true)} style={editBtn}>Upload Document</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => <SettingsContent />;

export default SettingsPage;
