import React, { useState, useEffect } from 'react';
// import { getToken } from '../../../lib/auth';
import { Conversation } from './ConversationsPage';

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
  onUpdateConversation 
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
    // Trigger slide-in animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 700); // Match animation duration
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
      const customersTable = `${agentPrefix}_customers`;
      const { error: updateError } = await supabase
        .from(customersTable)
        .update({ 
          name: editingName.trim(), 
          phone: editingPhone.trim() 
        })
        .eq('id', conversation.customerId)
        .eq('agent_id', agentId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
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
      const customersTable = `${agentPrefix}_customers`;
      const { error: updateError } = await supabase
        .from(customersTable)
        .update({
          ai_enabled: !aiEnabled
        })
        .eq('id', conversation.customerId)
        .eq('agent_id', agentId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      onUpdateConversation({
        ...conversation,
        aiEnabled: !aiEnabled,
      });

      setAiEnabled(!aiEnabled);
    } catch (err: any) {
      setError(`Failed to update AI setting: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-700" 
        style={{ opacity: isVisible ? 1 : 0 }}
        onClick={handleClose}
      />
      {/* Panel */}
      <div 
        className={`fixed right-0 top-0 h-full w-96 bg-gradient-to-b from-gray-50 to-white shadow-2xl z-50 border-l border-gray-200 transition-all duration-700 ease-out ${
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm flex items-center p-4 border-b border-gray-200 z-10">
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-3"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900 flex-1">Contact info</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-80px)]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {/* Profile Section */}
          <div className="relative">
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/50">
                <span className="text-white font-bold text-xl drop-shadow-md">
                  {editingName.charAt(0).toUpperCase()}
                </span>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                    placeholder="Enter name"
                  />
                ) : (
                  <h3 className="text-2xl font-bold text-gray-900 truncate">
                    {conversation.customerName}
                  </h3>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editingPhone}
                      onChange={(e) => setEditingPhone(e.target.value)}
                      className="text-sm text-gray-600 border-0 border-b border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.customerPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons in Edit Mode */}
          {isEditing && (
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                {saving ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save'
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 pt-4"></div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mx-auto mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">{conversation.messages.length}</p>
              <p className="text-sm text-gray-500">Messages</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">{lastSeen}</p>
              <p className="text-sm text-gray-500">Last seen</p>
            </div>
          </div>

          {/* AI Agent Toggle */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">AI Agent</p>
                <p className="text-sm text-gray-600">Enable AI assistance for this contact</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={aiEnabled}
                  onChange={handleToggleAI}
                  disabled={saving}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {conversation.unreadCount > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-orange-600">{conversation.unreadCount}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Unread messages</p>
                  <p className="text-sm text-gray-600">Tap to mark as read</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContactDetails;