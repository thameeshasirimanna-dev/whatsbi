import React, { useState, useEffect } from 'react';
import { getToken } from '../../../lib/auth';
import { SkeletonPage } from '../shared/Skeleton';
import { useDialog } from '../shared/DialogProvider';
import AccountInfoCard from './AccountInfoCard';
import PasswordCard from './PasswordCard';
import CompanyDocumentCard from './CompanyDocumentCard';
import TeamManagementCard from './TeamManagementCard';
import type { AgentProfile, UserProfile, TeamMember } from './types';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const SettingsPage: React.FC = () => {
  const { confirm: dlgConfirm, toast } = useDialog();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');

  // Password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  // Company document state
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Team management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState('');

  const isOwner = agent ? agent.logged_in_user_id === agent.user_id : false;

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (agent && agent.logged_in_user_id === agent.user_id) {
      fetchTeamMembers();
    }
  }, [agent]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        return;
      }
      const response = await fetch(`${backendUrl}/get-agent-profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Failed to fetch agent profile');
        return;
      }
      const agentData = data.agent;
      setUser({ id: agentData.id, email: agentData.email });
      setAgent({ ...agentData, credits: parseFloat(agentData.credits) || 0 });
      setCurrentDocument(agentData.company_overview_path || null);
    } catch (err) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setTeamLoading(true);
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${backendUrl}/agent/get-users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTeamMembers(data.users || []);
      } else {
        setTeamError(data.message || 'Failed to fetch team members');
      }
    } catch (err) {
      setTeamError('Failed to load team members');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleNameUpdate = async (newName: string) => {
    setUpdateMessage('');
    setError(null);
    if (!agent || !user) return;
    if (newName.trim().length < 2) {
      setUpdateMessage('Name must be at least 2 characters');
      return;
    }
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${backendUrl}/update-agent-details`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent.id,
          user_updates: { name: newName.trim() },
          agent_updates: {},
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAgent({ ...agent, name: newName.trim() });
        setUpdateMessage('Name updated successfully!');
        toast('Name updated successfully', 'success');
      } else {
        setUpdateMessage(data.message || 'Update failed');
      }
    } catch {
      setUpdateMessage('Failed to update name');
    }
  };

  const handleAgentDetailUpdate = async (
    field: 'address' | 'business_email' | 'contact_number' | 'website',
    value: string
  ) => {
    setUpdateMessage('');
    setError(null);
    if (!agent || !user) return;
    if (value.trim().length === 0) {
      setUpdateMessage('Field cannot be empty');
      return;
    }
    if (field === 'business_email' && !value.includes('@')) {
      setUpdateMessage('Please enter a valid email address');
      return;
    }
    if (field === 'contact_number' && !/^\+?[\d\s-()]{10,}$/.test(value)) {
      setUpdateMessage('Please enter a valid contact number');
      return;
    }
    if (field === 'website' && !/^https?:\/\/.+/.test(value)) {
      setUpdateMessage('Please enter a valid website URL starting with http:// or https://');
      return;
    }

    const updates: any = {};
    updates[field] = value.trim();

    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${backendUrl}/update-agent-details`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent.id,
          user_updates: {},
          agent_updates: updates,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAgent({ ...agent, [field]: value.trim() });
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
        setUpdateMessage(`${fieldName} updated successfully!`);
        toast(`${fieldName} updated successfully`, 'success');
      } else {
        setUpdateMessage(data.message || 'Update failed');
      }
    } catch {
      setUpdateMessage(`Failed to update ${field}`);
    }
  };

  const handlePasswordChange = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    setChangingPassword(true);
    setPasswordMessage('');
    setError(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      setChangingPassword(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage('New password must be at least 8 characters');
      setChangingPassword(false);
      return;
    }
    try {
      const token = getToken();
      if (!token) {
        setPasswordMessage('Please log in to continue');
        setChangingPassword(false);
        return;
      }
      const response = await fetch(`${backendUrl}/update-password`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPasswordMessage(data.message || 'Failed to update password');
      } else {
        setPasswordMessage('Password updated successfully!');
        toast('Password updated successfully', 'success');
      }
    } catch (err: any) {
      setPasswordMessage(`Failed to update password: ${err.message}`);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTemplateUpload = async (file: File) => {
    if (!agent || !user) return;
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['png', 'jpg', 'jpeg'].includes(fileExt)) {
      setUpdateMessage('Please select a valid image file (PNG, JPG, JPEG)');
      return;
    }
    const fileName = `invoice-template.${fileExt}`;
    const filePath = `agents/${agent.id}/${fileName}`;
    try {
      setUpdateMessage('');
      const token = getToken();
      if (!token) return;
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const fileBase64 = (base64 as string).split(',')[1];
      const fileType = file.type;
      const fName = file.name;
      const response = await fetch(`${backendUrl}/upload-invoice-template`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agent.id.toString(),
          file: { fileName: fName, fileBase64, fileType },
        }),
      });
      const data = await response.json();
      if (data && data.success) {
        setAgent({ ...agent, invoice_template_path: filePath });
        setUpdateMessage('Invoice template uploaded successfully!');
        toast('Invoice template uploaded successfully', 'success');
      } else {
        setUpdateMessage('Upload failed: ' + (data?.error || 'Unknown error'));
      }
    } catch (err: any) {
      setUpdateMessage(`Upload failed: ${err.message}`);
    }
  };

  const handleTemplateRemove = async () => {
    if (!agent?.invoice_template_path || !agent) return;
    if (
      !(await dlgConfirm(
        'Are you sure you want to remove the branded invoice template?',
        { danger: true, confirmLabel: 'Remove' }
      ))
    ) {
      return;
    }
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${backendUrl}/update-agent-template-path`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agent_id: agent.id, template_path: null }),
      });
      const data = await response.json();
      if (data.success) {
        setAgent({ ...agent, invoice_template_path: undefined });
        setUpdateMessage('Invoice template removed successfully!');
        toast('Invoice template removed', 'success');
      } else {
        setUpdateMessage(data.message || 'Removal failed');
      }
    } catch (err: any) {
      setUpdateMessage(`Removal failed: ${err.message}`);
    }
  };

  const handleDocumentUpload = async (file: File) => {
    if (!agent || !user) return;
    try {
      setUpdateMessage('');
      setUploadProgress(0);
      const token = getToken();
      const formData = new FormData();
      formData.append('agentId', agent.id.toString());
      formData.append('file', file);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${backendUrl}/upload-company-overview`);

        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
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
                toast('Company overview document uploaded successfully!', 'success');
                resolve(data);
              } else {
                reject(new Error(data.error || 'Upload failed'));
              }
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          setUploadProgress(null);
          reject(new Error('Network connection error'));
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
    if (
      !(await dlgConfirm(
        'Are you sure you want to remove the company overview document?',
        { danger: true, confirmLabel: 'Remove' }
      ))
    ) {
      return;
    }
    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${backendUrl}/delete-company-overview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ agentId: agent.id.toString() }),
      });
      const data = await response.json();
      if (data && data.success) {
        setCurrentDocument(null);
        toast('Company overview document removed successfully!', 'success');
      } else {
        setUpdateMessage('Removal failed: ' + (data?.error || 'Unknown error'));
      }
    } catch (err: any) {
      setUpdateMessage(`Removal failed: ${err.message}`);
    }
  };

  const handleDownloadMarginGuide = async () => {
    try {
      const response = await fetch(`${backendUrl}/get-invoice-template`);
      if (!response.ok) throw new Error('Failed to fetch guide template');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Invoice_Margin_Guide.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      const fallbackLink = document.createElement('a');
      fallbackLink.href = `${backendUrl}/get-invoice-template`;
      fallbackLink.download = 'Invoice_Margin_Guide.png';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    }
  };

  const handleAddTeamMember = async (name: string, email: string, pass: string) => {
    setAddingMember(true);
    setAddMemberError('');
    setAddMemberSuccess('');

    if (!name.trim() || !email.trim() || !pass.trim()) {
      setAddMemberError('All fields are required');
      setAddingMember(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${backendUrl}/agent/add-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: pass,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAddMemberSuccess('Team member added successfully!');
        toast('Team member added successfully', 'success');
        fetchTeamMembers();
      } else {
        setAddMemberError(data.message || 'Failed to add team member');
      }
    } catch (err: any) {
      setAddMemberError(`Failed: ${err.message}`);
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteTeamMember = async (userId: string) => {
    if (
      !(await dlgConfirm('Are you sure you want to remove this team member?', {
        danger: true,
        confirmLabel: 'Remove Member',
      }))
    ) {
      return;
    }

    try {
      setTeamError('');
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${backendUrl}/agent/delete-user/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        fetchTeamMembers();
        toast('Team member removed', 'success');
      } else {
        setTeamError(data.message || 'Failed to delete team member');
      }
    } catch (err: any) {
      setTeamError(`Failed to delete team member: ${err.message}`);
    }
  };

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* Grid: 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Left Column: Account Profile */}
        <AccountInfoCard
          agent={agent}
          user={user}
          isOwner={isOwner}
          onUpdateName={handleNameUpdate}
          onUpdateDetail={handleAgentDetailUpdate}
          onUploadTemplate={handleTemplateUpload}
          onRemoveTemplate={handleTemplateRemove}
          onDownloadMarginGuide={handleDownloadMarginGuide}
          updateMessage={updateMessage}
          error={error}
        />

        {/* Right Column: Security & Company Document */}
        <div className="flex flex-col gap-3.5 sm:gap-4 h-full">
          <PasswordCard
            onUpdatePassword={handlePasswordChange}
            changingPassword={changingPassword}
            passwordMessage={passwordMessage}
          />

          <CompanyDocumentCard
            currentDocument={currentDocument}
            isOwner={isOwner}
            onUploadDocument={handleDocumentUpload}
            onRemoveDocument={handleDocumentRemove}
            uploadProgress={uploadProgress}
          />
        </div>
      </div>

      {/* Full width: Team Management (Owners only) */}
      {isOwner && (
        <TeamManagementCard
          teamMembers={teamMembers}
          teamLoading={teamLoading}
          teamError={teamError}
          onAddMember={handleAddTeamMember}
          onDeleteMember={handleDeleteTeamMember}
          addingMember={addingMember}
          addMemberError={addMemberError}
          addMemberSuccess={addMemberSuccess}
        />
      )}
    </div>
  );
};

export default SettingsPage;
