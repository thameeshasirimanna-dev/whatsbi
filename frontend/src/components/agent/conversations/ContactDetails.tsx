import React, { useState, useEffect } from 'react';
import { getToken } from '../../../lib/auth';
import { Conversation } from './ConversationsPage';
import { X, MessageSquare, Clock, Sparkles, Phone, User, Check, Edit3 } from 'lucide-react';
import Portal from '../shared/Portal';

interface ContactDetailsProps {
  conversation: Conversation | null;
  onClose: () => void;
  agentPrefix: string | null;
  agentId: number | null;
  onUpdateConversation: (updatedConversation: Conversation) => void;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({
  conversation,
  onClose,
  agentPrefix,
  agentId,
  onUpdateConversation,
}) => {
  if (!conversation) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(conversation.customerName);
  const [editingPhone, setEditingPhone] = useState(conversation.customerPhone);
  const [aiEnabled, setAiEnabled] = useState(conversation.aiEnabled || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const lastSeen = conversation.lastUserMessageTime
    ? new Date(conversation.lastUserMessageTime).toLocaleString([], {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    : 'Never';

  const handleSave = async () => {
    if (!agentPrefix || !agentId) {
      setError('Agent information not available');
      return;
    }
    if (editingName.trim() === '' || editingPhone.trim() === '') {
      setError('Name and phone are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: conversation.customerId,
            name: editingName.trim(),
            phone: editingPhone.trim(),
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to update customer');
      onUpdateConversation({
        ...conversation,
        customerName: editingName.trim(),
        customerPhone: editingPhone.trim(),
      });
      setIsEditing(false);
    } catch (err: any) {
      setError(`Failed to update contact: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingName(conversation.customerName);
    setEditingPhone(conversation.customerPhone);
    setIsEditing(false);
    setError(null);
  };

  const handleToggleAI = async () => {
    if (!agentPrefix || !agentId) {
      setError('Agent information not available');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-customers`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: conversation.customerId,
            ai_enabled: !aiEnabled,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to update AI setting');
      onUpdateConversation({ ...conversation, aiEnabled: !aiEnabled });
      setAiEnabled(!aiEnabled);
    } catch (err: any) {
      setError(`Failed to update AI setting: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-[380px] bg-white border-l border-[#EAEAEA] shadow-2xl z-[100] flex flex-col overflow-hidden transition-transform duration-200 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#EAEAEA] px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] transition-colors border-0 cursor-pointer"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
            <h2 className="font-sans text-base font-bold text-[#16281D]">
              Contact Details
            </h2>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#F4F7F4] text-[#16281D] hover:bg-[#EAEAEA] active:scale-95 transition-all cursor-pointer border-0"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs font-sans text-[#EF4444]">
              {error}
            </div>
          )}

          {/* Profile Card */}
          <div className="p-5 rounded-2xl bg-[#F4F7F4]/60 border border-[#EAEAEA] flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full bg-[#16281D] text-[#9FE870] font-sans text-2xl font-bold flex items-center justify-center shadow-md ring-4 ring-white">
                {editingName.charAt(0).toUpperCase()}
              </div>
              <div
                className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#9FE870] border-2 border-white ring-1 ring-[#16281D]/10"
                title="Active"
              />
            </div>

            {isEditing ? (
              <div className="w-full space-y-3 mt-2">
                <div>
                  <label className="block text-left text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-sans font-medium text-[#16281D] bg-white border border-[#EAEAEA] rounded-xl focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 outline-none transition-all"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-left text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editingPhone}
                    onChange={(e) => setEditingPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono text-[#16281D] bg-white border border-[#EAEAEA] rounded-xl focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 outline-none transition-all"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 h-10 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold font-sans shadow-[0_4px_14px_rgba(159,232,112,0.35)] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 cursor-pointer border-0"
                  >
                    {saving ? (
                      <span className="inline-block w-4 h-4 border-2 border-[#16281D]/20 border-t-[#16281D] rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={14} strokeWidth={2.5} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="h-10 px-4 rounded-full bg-white border border-[#E4E4E7] hover:bg-[#F4F7F4] text-[#52525B] text-xs font-bold font-sans transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-sans text-lg font-bold text-[#16281D] truncate max-w-full">
                  {conversation.customerName}
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#71717A] mt-0.5">
                  <Phone size={12} className="text-[#9FE870]" />
                  <span>{conversation.customerPhone}</span>
                </div>
              </>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[#EAEAEA] rounded-2xl p-4 text-center shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#F4F7F4] flex items-center justify-center mx-auto mb-2 text-[#16281D]">
                <MessageSquare size={16} />
              </div>
              <div className="font-mono text-xl font-bold text-[#16281D] leading-tight">
                {conversation.messages.length}
              </div>
              <div className="font-sans text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mt-1">
                Messages
              </div>
            </div>

            <div className="bg-white border border-[#EAEAEA] rounded-2xl p-4 text-center shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#F4F7F4] flex items-center justify-center mx-auto mb-2 text-[#16281D]">
                <Clock size={16} />
              </div>
              <div className="font-mono text-xs font-bold text-[#16281D] leading-tight truncate px-1" title={lastSeen}>
                {lastSeen}
              </div>
              <div className="font-sans text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mt-1">
                Last Seen
              </div>
            </div>
          </div>

          {/* AI Autonomous Assistance Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="font-sans text-sm font-bold text-[#16281D]">
                    AI Co-Pilot
                  </div>
                  <div className="font-sans text-xs text-[#71717A] mt-0.5">
                    Automated AI assistance for this contact
                  </div>
                </div>
              </div>

              {/* Toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={aiEnabled}
                  onChange={handleToggleAI}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-[#E4E4E7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D4D4D8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9FE870] shadow-2xs" />
              </label>
            </div>
          </div>

          {/* Unread Alert */}
          {conversation.unreadCount > 0 && (
            <div className="p-4 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-mono text-xs font-bold shrink-0">
                {conversation.unreadCount}
              </div>
              <div>
                <div className="font-sans text-xs font-bold text-[#92400E]">
                  Unread Messages
                </div>
                <div className="font-sans text-[11px] text-[#B45309]">
                  {conversation.unreadCount} messages awaiting your response
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </Portal>
  );
};

export default ContactDetails;

