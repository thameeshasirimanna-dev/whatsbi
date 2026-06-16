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
    user_id?: string; logged_in_user_id?: string;
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Team Management state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");
  const [addMemberSuccess, setAddMemberSuccess] = useState("");

  const isOwner = agent ? agent.logged_in_user_id === agent.user_id : false;

  const fetchTeamMembers = async () => {
    try {
      setTeamLoading(true);
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${backendUrl}/agent/get-users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTeamMembers(data.users || []);
      } else {
        setTeamError(data.message || "Failed to fetch team members");
      }
    } catch (err) {
      setTeamError("Failed to load team members");
    } finally {
      setTeamLoading(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    setAddMemberError("");
    setAddMemberSuccess("");

    if (!newMemberName.trim() || !newMemberEmail.trim() || !newMemberPassword.trim()) {
      setAddMemberError("All fields are required");
      setAddingMember(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setAddMemberError("Authentication required");
        setAddingMember(false);
        return;
      }

      const response = await fetch(`${backendUrl}/agent/add-user`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim(),
          email: newMemberEmail.trim(),
          password: newMemberPassword
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAddMemberSuccess("Team member added successfully!");
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberPassword("");
        fetchTeamMembers();
        setTimeout(() => {
          setShowAddMemberModal(false);
          setAddMemberSuccess("");
        }, 1500);
      } else {
        setAddMemberError(data.message || "Failed to add team member");
      }
    } catch (err: any) {
      setAddMemberError(`Failed: ${err.message}`);
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteTeamMember = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this team member?")) return;

    try {
      setTeamError("");
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${backendUrl}/agent/delete-user/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        fetchTeamMembers();
      } else {
        setTeamError(data.message || "Failed to delete team member");
      }
    } catch (err: any) {
      setTeamError(`Failed to delete team member: ${err.message}`);
    }
  };

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
        setCurrentDocument(agentData.company_overview_path || null);
      } catch (err) {
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (agent && agent.logged_in_user_id === agent.user_id) {
      fetchTeamMembers();
    }
  }, [agent]);

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
    try {
      setUpdateMessage("");
      setUploadProgress(0);
      const token = getToken();
      const formData = new FormData();
      formData.append("agentId", agent.id.toString());
      formData.append("file", selectedDocumentFile);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${import.meta.env.VITE_BACKEND_URL}/upload-company-overview`);
        
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          setUploadProgress(null);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data && data.success) {
                setCurrentDocument(data.filePath);
                setSelectedDocumentFile(null);
                setEditingDocument(false);
                setUpdateMessage("Company overview document uploaded successfully!");
                resolve(data);
              } else {
                reject(new Error(data.error || "Upload failed"));
              }
            } catch (e) {
              reject(new Error("Invalid response from server"));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          setUploadProgress(null);
          reject(new Error("Network connection error"));
        };

        xhr.send(formData);
      });
    } catch (err: any) {
      setUploadProgress(null);
      setUpdateMessage(`Upload failed: ${err.message}`);
    }
  };

  const handleDocumentRemove = async () => {
    if (!currentDocument || !agent) return;
    try {
      setUpdateMessage("");
      const token = getToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/delete-company-overview`, {
        method: "POST",
        headers,
        body: JSON.stringify({ agentId: agent.id.toString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Removal failed");
      if (data && data.success) {
        setCurrentDocument(null);
        setUpdateMessage("Company overview document removed successfully!");
      } else { setUpdateMessage("Removal failed: " + (data?.error || "Unknown error")); }
    } catch (err: any) { setUpdateMessage(`Removal failed: ${err.message}`); }
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

          {!isOwner && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 9, background: 'rgba(59,130,246,0.08)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.2)', ...DM, fontSize: 13 }}>
              Only the owner can edit agent business settings.
            </div>
          )}

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
                readOnly={!isOwner}
              />
              <EditableField
                label="Business Email" value={agent.business_email || ''} editing={editingBusinessEmail}
                editValue={newBusinessEmail} onEditChange={setNewBusinessEmail}
                onEditStart={() => { setEditingBusinessEmail(true); setUpdateMessage(""); }}
                onSave={e => { e.preventDefault(); handleAgentDetailUpdate("business_email", newBusinessEmail); }}
                onCancel={() => { setEditingBusinessEmail(false); setNewBusinessEmail(agent?.business_email || ""); setUpdateMessage(""); }}
                type="email" placeholder="Enter business email"
                readOnly={!isOwner}
              />
              <EditableField
                label="Contact Number" value={agent.contact_number || ''} editing={editingContactNumber}
                editValue={newContactNumber} onEditChange={setNewContactNumber}
                onEditStart={() => { setEditingContactNumber(true); setUpdateMessage(""); }}
                onSave={e => { e.preventDefault(); handleAgentDetailUpdate("contact_number", newContactNumber); }}
                onCancel={() => { setEditingContactNumber(false); setNewContactNumber(agent?.contact_number || ""); setUpdateMessage(""); }}
                type="tel" placeholder="Enter contact number"
                readOnly={!isOwner}
              />
              <EditableField
                label="Website" value={agent.website || ''} editing={editingWebsite}
                editValue={newWebsite} onEditChange={setNewWebsite}
                onEditStart={() => { setEditingWebsite(true); setUpdateMessage(""); }}
                onSave={e => { e.preventDefault(); handleAgentDetailUpdate("website", newWebsite); }}
                onCancel={() => { setEditingWebsite(false); setNewWebsite(agent?.website || ""); setUpdateMessage(""); }}
                type="url" placeholder="Enter website URL (e.g., https://example.com)"
                readOnly={!isOwner}
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
                    {isOwner && (
                      <button onClick={() => { setEditingCredits(true); setCreditsMessage(""); }} style={editBtn}>
                        Add Credits
                      </button>
                    )}
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
                      {isOwner && currentTemplate && (
                        <>
                          <button onClick={() => setEditingTemplate(true)} style={editBtn}>Change</button>
                          <button onClick={handleTemplateRemove} style={{ ...editBtn, background: 'rgba(244,63,94,0.08)', color: '#f43f5e' }}>Remove</button>
                        </>
                      )}
                      {isOwner && !currentTemplate && (
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f9f9f9', border: '1px dashed #d4d4d8', borderRadius: 9, cursor: uploadProgress !== null ? 'not-allowed' : 'pointer', opacity: uploadProgress !== null ? 0.6 : 1 }}>
              <Upload size={14} style={{ color: '#71717a' }} />
              <span style={{ ...DM, fontSize: 13, color: selectedDocumentFile ? '#0c1a0e' : '#71717a' }}>
                {selectedDocumentFile ? selectedDocumentFile.name : 'Choose file (.txt, .pdf, .doc, .docx)'}
              </span>
              <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={e => setSelectedDocumentFile(e.target.files?.[0] || null)} disabled={uploadProgress !== null} style={{ display: 'none' }} />
            </label>
            {uploadProgress === null ? (
              <div style={{ display: 'flex', gap: 8, maxWidth: 320 }}>
                <button type="button" onClick={handleDocumentUpload} disabled={!selectedDocumentFile} style={{ ...saveBtn, opacity: !selectedDocumentFile ? 0.5 : 1 }}>
                  Upload
                </button>
                <button type="button" onClick={() => { setEditingDocument(false); setSelectedDocumentFile(null); setUpdateMessage(""); }} style={cancelBtn}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: 320 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...DM, fontSize: 12, color: '#71717a', marginBottom: 4 }}>
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#e4e4e7', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', transition: 'width 0.1s ease-out' }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ ...DM, fontSize: 14, color: currentDocument ? '#0c1a0e' : '#a1a1aa' }}>
              {currentDocument ? (
                <a
                  href={currentDocument}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#22c55e', textDecoration: 'underline' }}
                >
                  {currentDocument.split('/').pop()?.replace(/^company_overview_\d+_/, '') || 'View Document'}
                </a>
              ) : 'No document set'}
            </span>
            {isOwner && (
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
            )}
          </div>
        )}
      </div>

      {/* Team Management */}
      {isOwner && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {sectionIcon('rgba(245,158,11,0.1)', '#d97706', <User size={15} />)}
              <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Team Management</span>
            </div>
            <button
              onClick={() => { setShowAddMemberModal(true); setAddMemberError(""); setAddMemberSuccess(""); }}
              style={{ ...editBtn, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff' }}
            >
              Add Team Member
            </button>
          </div>

          {teamError && <StatusMessage msg={teamError} />}

          {teamLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.15)', borderTopColor: '#d97706', animation: 'st-spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', ...DM }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f4f4f5', textAlign: 'left' }}>
                    <th style={{ padding: '10px 8px', fontSize: 12, color: '#71717a', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '10px 8px', fontSize: 12, color: '#71717a', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '10px 8px', fontSize: 12, color: '#71717a', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '10px 8px', fontSize: 12, color: '#71717a', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                      <td style={{ padding: '12px 8px', fontSize: 14, color: '#0c1a0e', fontWeight: member.is_owner ? 600 : 400 }}>
                        {member.name}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 14, color: '#4b5563' }}>{member.email}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: member.is_owner ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                          color: member.is_owner ? '#059669' : '#4b5563',
                        }}>
                          {member.is_owner ? 'Owner' : 'Agent'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {!member.is_owner && (
                          <button
                            onClick={() => handleDeleteTeamMember(member.id)}
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {teamMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px 8px', textAlign: 'center', color: '#71717a', fontSize: 13 }}>
                        No team members registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddMemberModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #ebebeb',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
            animation: 'modal-fade-in 0.2s ease-out'
          }}>
            <style>{`
              @keyframes modal-fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ebebeb', paddingBottom: 12 }}>
              <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e' }}>Add Team Member</span>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTeamMember} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ ...DM, fontSize: 12, color: '#71717a', display: 'block', marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocusG}
                  onBlur={onBlurG}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label style={{ ...DM, fontSize: 12, color: '#71717a', display: 'block', marginBottom: 4 }}>Email Address</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocusG}
                  onBlur={onBlurG}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <label style={{ ...DM, fontSize: 12, color: '#71717a', display: 'block', marginBottom: 4 }}>Password</label>
                <input
                  type="password"
                  value={newMemberPassword}
                  onChange={e => setNewMemberPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocusG}
                  onBlur={onBlurG}
                  placeholder="Enter password"
                  required
                />
              </div>

              {addMemberError && <StatusMessage msg={addMemberError} />}
              {addMemberSuccess && <StatusMessage msg={addMemberSuccess} />}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={addingMember}
                  style={{ ...saveBtn, padding: '10px 0', opacity: addingMember ? 0.6 : 1 }}
                >
                  {addingMember ? "Adding…" : "Add Member"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  style={{ ...cancelBtn, padding: '10px 0' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsPage: React.FC = () => <SettingsContent />;

export default SettingsPage;
