import React, { useState, useEffect } from 'react';
import { getToken } from '../../../lib/auth';
import { Conversation } from './ConversationsPage';
import { ChevronLeft, MessageSquare, Clock } from 'lucide-react';
import Portal from '../shared/Portal';


const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

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
    setTimeout(onClose, 700);
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
      <style>{`@keyframes cd-spin { to { transform: rotate(360deg); } }`}</style>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          transition: 'opacity 0.7s',
          opacity: isVisible ? 1 : 0,
          zIndex: 40,
        }}
        onClick={handleClose}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0,
          width: 384,
          background: '#fff',
          borderLeft: '1px solid #ebebeb',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
          zIndex: 50,
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          opacity: isVisible ? 1 : 0,
          transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.7s',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: '#fff',
          borderBottom: '1px solid #ebebeb',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 10, flexShrink: 0,
        }}>
          <button
            onClick={handleClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
          >
            <ChevronLeft size={16} style={{ color: '#71717a' }} />
          </button>
          <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', flex: 1 }}>
            Contact info
          </span>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                ...DM, fontSize: 13, fontWeight: 500,
                padding: '6px 14px', borderRadius: 8,
                background: 'rgba(34,197,94,0.08)',
                border: 'none', cursor: 'pointer',
                color: '#059669', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.08)')}
            >
              Edit
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px' }}>
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 16,
              background: 'rgba(244,63,94,0.06)',
              border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: 10,
              ...DM, fontSize: 13, color: '#f43f5e',
            }}>
              {error}
            </div>
          )}

          {/* Profile */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                position: 'relative', width: 72, height: 72, flexShrink: 0,
                background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
              }}>
                <span style={{ ...SYNE, fontSize: 26, fontWeight: 800, color: '#fff' }}>
                  {editingName.charAt(0).toUpperCase()}
                </span>
                <div style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#22c55e', border: '2px solid #fff',
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    style={{
                      ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e',
                      background: '#f9f9f9', border: '1px solid #ebebeb',
                      borderRadius: 8, padding: '6px 10px',
                      outline: 'none', width: '100%', boxSizing: 'border-box',
                      marginBottom: 6,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
                    placeholder="Enter name"
                  />
                ) : (
                  <div style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conversation.customerName}
                  </div>
                )}
                {isEditing ? (
                  <input
                    type="tel"
                    value={editingPhone}
                    onChange={e => setEditingPhone(e.target.value)}
                    style={{
                      ...DM, fontSize: 13, color: '#71717a',
                      background: '#f9f9f9', border: '1px solid #ebebeb',
                      borderRadius: 8, padding: '5px 10px',
                      outline: 'none', width: '100%', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div style={{ ...DM, fontSize: 13, color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conversation.customerPhone}
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    background: saving ? 'rgba(34,197,94,0.5)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    padding: '10px 0',
                    ...SYNE, fontSize: 14, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {saving ? (
                    <>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        animation: 'cd-spin 0.8s linear infinite',
                      }} />
                      Saving...
                    </>
                  ) : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={{
                    padding: '10px 18px',
                    background: 'rgba(0,0,0,0.06)',
                    color: '#3f3f46', border: 'none', borderRadius: 10,
                    ...DM, fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#f4f4f5', marginBottom: 16 }} />

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{
              background: '#fff', border: '1px solid #ebebeb', borderRadius: 12,
              padding: '14px 12px', textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(34,197,94,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px',
              }}>
                <MessageSquare size={16} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ ...SYNE, fontSize: 22, fontWeight: 700, color: '#0c1a0e', lineHeight: 1 }}>
                {conversation.messages.length}
              </div>
              <div style={{ ...DM, fontSize: 11, color: '#71717a', marginTop: 4 }}>Messages</div>
            </div>
            <div style={{
              background: '#fff', border: '1px solid #ebebeb', borderRadius: 12,
              padding: '14px 12px', textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(8,145,178,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px',
              }}>
                <Clock size={16} style={{ color: '#0891b2' }} />
              </div>
              <div style={{ ...SYNE, fontSize: 12, fontWeight: 700, color: '#0c1a0e', lineHeight: 1.3 }}>
                {lastSeen}
              </div>
              <div style={{ ...DM, fontSize: 11, color: '#71717a', marginTop: 4 }}>Last seen</div>
            </div>
          </div>

          {/* AI Toggle */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.2)',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ ...DM, fontSize: 14, fontWeight: 600, color: '#0c1a0e', marginBottom: 2 }}>
                  AI Agent
                </div>
                <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>
                  Enable AI assistance for this contact
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: saving ? 'not-allowed' : 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  checked={aiEnabled}
                  onChange={handleToggleAI}
                  disabled={saving}
                />
                <div style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: aiEnabled ? '#22c55e' : '#d4d4d8',
                  transition: 'background 0.2s',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: 2,
                    left: aiEnabled ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s',
                  }} />
                </div>
              </label>
            </div>
          </div>

          {conversation.unreadCount > 0 && (
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(217,119,6,0.06)',
              border: '1px solid rgba(217,119,6,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(217,119,6,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ ...SYNE, fontSize: 14, fontWeight: 800, color: '#d97706' }}>
                    {conversation.unreadCount}
                  </span>
                </div>
                <div>
                  <div style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>Unread messages</div>
                  <div style={{ ...DM, fontSize: 12, color: '#71717a' }}>Tap to mark as read</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default ContactDetails;
