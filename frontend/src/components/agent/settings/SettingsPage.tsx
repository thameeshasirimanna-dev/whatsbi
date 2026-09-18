import React, { useState, useEffect } from 'react';
import { SkeletonPage } from '../shared/Skeleton';
import { useDialog } from '../shared/DialogProvider';
import AccountInfoCard from './AccountInfoCard';
import PasswordCard from './PasswordCard';
import CompanyOverviewCard from './CompanyOverviewCard';
import TeamManagementCard from './TeamManagementCard';
import type { AgentProfile, UserProfile, TeamMember } from './types';
import {
  fetchAgentProfileApi,
  fetchTeamMembersApi,
  updateAgentDetailsApi,
  updatePasswordApi,
  uploadInvoiceTemplateApi,
  removeInvoiceTemplateApi,
  saveCompanyOverviewApi,
  deleteCompanyOverviewApi,
  addTeamMemberApi,
  deleteTeamMemberApi,
  downloadInvoiceMarginGuide,
} from './settingsApi';

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

  // Company overview state
  const [companyOverview, setCompanyOverview] = useState<string>('');
  const [savingOverview, setSavingOverview] = useState<boolean>(false);

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
      const data = await fetchAgentProfileApi(backendUrl);
      if (!data.success) {
        setError(data.message || 'Failed to fetch agent profile');
        return;
      }
      const agentData = data.agent;
      setUser({ id: agentData.id, email: agentData.email });
      setAgent({ ...agentData, credits: parseFloat(agentData.credits) || 0 });
      setCompanyOverview(agentData.company_overview || '');
    } catch {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setTeamLoading(true);
      const data = await fetchTeamMembersApi(backendUrl);
      if (data.success) {
        setTeamMembers(data.users || []);
      } else {
        setTeamError(data.message || 'Failed to fetch team members');
      }
    } catch {
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
      const data = await updateAgentDetailsApi(backendUrl, {
        agent_id: agent.id,
        user_updates: { name: newName.trim() },
        agent_updates: {},
      });
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

    try {
      const data = await updateAgentDetailsApi(backendUrl, {
        agent_id: agent.id,
        user_updates: {},
        agent_updates: { [field]: value.trim() },
      });
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
      const data = await updatePasswordApi(backendUrl, currentPassword, newPassword);
      if (!data.success && data.message) {
        setPasswordMessage(data.message);
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
      const data = await uploadInvoiceTemplateApi(backendUrl, agent.id.toString(), file);
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
      const data = await removeInvoiceTemplateApi(backendUrl, agent.id);
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

  const handleSaveCompanyOverview = async (newText: string) => {
    if (!agent) return;
    try {
      setSavingOverview(true);
      const data = await saveCompanyOverviewApi(backendUrl, agent.id.toString(), newText);
      if (data && data.success) {
        setCompanyOverview(newText);
        setAgent({ ...agent, company_overview: newText });
        toast('Company overview updated successfully!', 'success');
      } else {
        toast(data?.error || 'Failed to update company overview', 'error');
      }
    } catch (err: any) {
      toast(`Failed to update company overview: ${err.message}`, 'error');
    } finally {
      setSavingOverview(false);
    }
  };

  const handleClearCompanyOverview = async () => {
    if (!agent) return;
    if (
      !(await dlgConfirm(
        'Are you sure you want to remove the company overview? The AI chatbot will revert to default system prompts.',
        { danger: true, confirmLabel: 'Clear Overview' }
      ))
    ) {
      return;
    }
    try {
      setSavingOverview(true);
      const data = await deleteCompanyOverviewApi(backendUrl, agent.id.toString());
      if (data && data.success) {
        setCompanyOverview('');
        setAgent({ ...agent, company_overview: '' });
        toast('Company overview cleared successfully!', 'success');
      } else {
        toast(data?.error || 'Failed to clear company overview', 'error');
      }
    } catch (err: any) {
      toast(`Failed to clear company overview: ${err.message}`, 'error');
    } finally {
      setSavingOverview(false);
    }
  };

  const handleDownloadMarginGuide = () => {
    downloadInvoiceMarginGuide(backendUrl);
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
      const data = await addTeamMemberApi(backendUrl, name.trim(), email.trim(), pass);
      if (data.success) {
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
      const data = await deleteTeamMemberApi(backendUrl, userId);
      if (data.success) {
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

        {/* Right Column: Security & Company Overview */}
        <div className="flex flex-col gap-3.5 sm:gap-4 h-full">
          <PasswordCard
            onUpdatePassword={handlePasswordChange}
            changingPassword={changingPassword}
            passwordMessage={passwordMessage}
          />

          <CompanyOverviewCard
            companyOverview={companyOverview}
            isOwner={isOwner}
            onSaveOverview={handleSaveCompanyOverview}
            onClearOverview={handleClearCompanyOverview}
            saving={savingOverview}
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
