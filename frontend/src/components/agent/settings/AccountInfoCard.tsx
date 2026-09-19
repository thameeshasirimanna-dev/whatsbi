import React, { useState } from 'react';
import { User, FileText, Upload, Coins, Check, Download, Trash2, Edit3 } from 'lucide-react';
import type { AgentProfile, UserProfile } from './types';

interface AccountInfoCardProps {
  agent: AgentProfile | null;
  user: UserProfile | null;
  isOwner: boolean;
  onUpdateName: (name: string) => Promise<void>;
  onUpdateDetail: (
    field: 'address' | 'business_email' | 'contact_number' | 'website',
    value: string
  ) => Promise<void>;
  onUploadTemplate: (file: File) => Promise<void>;
  onRemoveTemplate: () => Promise<void>;
  onDownloadMarginGuide: () => void;
  updateMessage: string;
  error: string | null;
}

const AccountInfoCard: React.FC<AccountInfoCardProps> = ({
  agent,
  user,
  isOwner,
  onUpdateName,
  onUpdateDetail,
  onUploadTemplate,
  onRemoveTemplate,
  onDownloadMarginGuide,
  updateMessage,
  error,
}) => {
  // Editing state for each field
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  // Template upload state
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  const startEditing = (field: string, initialVal: string) => {
    setEditingField(field);
    setFieldValue(initialVal);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setFieldValue('');
  };

  const handleSave = async (field: string) => {
    if (field === 'name') {
      await onUpdateName(fieldValue);
    } else {
      await onUpdateDetail(
        field as 'address' | 'business_email' | 'contact_number' | 'website',
        fieldValue
      );
    }
    setEditingField(null);
  };

  const handleFileSubmit = async () => {
    if (!selectedFile) return;
    try {
      setUploadingTemplate(true);
      await onUploadTemplate(selectedFile);
      setEditingTemplate(false);
      setSelectedFile(null);
    } finally {
      setUploadingTemplate(false);
    }
  };

  if (!agent || !user) {
    return (
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] p-8 text-center text-xs text-[#71717A]">
        Unable to load account information.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-4 sm:p-6 md:p-8 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#EAEAEA] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9FE870]/20 text-[#16281D] flex items-center justify-center font-bold">
              <User size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                Profile & Company
              </span>
              <h3 className="text-base font-bold text-[#16281D]">Account Information</h3>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
              isOwner
                ? 'bg-[#22C55E]/10 text-[#15803D]'
                : 'bg-[#3B82F6]/10 text-[#2563EB]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOwner ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'
              }`}
            />
            {isOwner ? 'Account Owner' : 'Agent Member'}
          </span>
        </div>

        {!isOwner && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-xs text-[#2563EB] flex items-center gap-2">
            <span>Only the account owner has permission to modify core business details.</span>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        {updateMessage && (
          <div
            className={`mb-5 p-3.5 rounded-2xl text-xs border ${
              updateMessage.toLowerCase().includes('success')
                ? 'bg-[#22C55E]/10 text-[#15803D] border-[#22C55E]/20'
                : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
            }`}
          >
            {updateMessage}
          </div>
        )}

        {/* Fields List */}
        <div className="divide-y divide-[#F4F7F4]">
          {/* Full Name */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#71717A] w-36 shrink-0">
              Contact Name
            </span>
            {editingField === 'name' ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white"
                  placeholder="Enter contact name"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSave('name')}
                  className="px-3 py-1.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-3 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-medium text-[#71717A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#16281D]">
                  {agent.name || 'Not set'}
                </span>
                <button
                  type="button"
                  onClick={() => startEditing('name', agent.name || '')}
                  className="px-2.5 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[11px] font-semibold text-[#16281D] transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Email (Read only) */}
          <div className="py-3.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#71717A] w-36 shrink-0">
              Account Email
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#16281D]">{user.email}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full">
                Primary
              </span>
            </div>
          </div>

          {/* WhatsApp Number (Read only) */}
          <div className="py-3.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#71717A] w-36 shrink-0">
              WhatsApp Number
            </span>
            <span className="text-xs font-mono font-semibold text-[#16281D]">
              {agent.whatsapp_number || 'Not connected'}
            </span>
          </div>

          {/* Address */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#71717A] w-36 shrink-0">
              Business Address
            </span>
            {editingField === 'address' ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white"
                  placeholder="Enter business address"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSave('address')}
                  className="px-3 py-1.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-3 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-medium text-[#71717A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#16281D]">
                  {agent.address || <span className="text-[#71717A]">Not provided</span>}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => startEditing('address', agent.address || '')}
                    className="px-2.5 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[11px] font-semibold text-[#16281D] transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Business Email */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#71717A] w-36 shrink-0">
              Business Email
            </span>
            {editingField === 'business_email' ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="email"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white"
                  placeholder="name@business.com"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSave('business_email')}
                  className="px-3 py-1.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-3 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-medium text-[#71717A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-[#16281D]">
                  {agent.business_email || <span className="text-[#71717A]">Not provided</span>}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => startEditing('business_email', agent.business_email || '')}
                    className="px-2.5 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[11px] font-semibold text-[#16281D] transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact Number */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#71717A] w-36 shrink-0">
              Contact Phone
            </span>
            {editingField === 'contact_number' ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="tel"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white"
                  placeholder="+1 234 567 890"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSave('contact_number')}
                  className="px-3 py-1.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-3 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-medium text-[#71717A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-[#16281D]">
                  {agent.contact_number || <span className="text-[#71717A]">Not provided</span>}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => startEditing('contact_number', agent.contact_number || '')}
                    className="px-2.5 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[11px] font-semibold text-[#16281D] transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Website */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#71717A] w-36 shrink-0">
              Official Website
            </span>
            {editingField === 'website' ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="url"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white"
                  placeholder="https://example.com"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSave('website')}
                  className="px-3 py-1.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-3 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-medium text-[#71717A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-[#16281D]">
                  {agent.website ? (
                    <a
                      href={agent.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#16281D] underline hover:text-[#15803D]"
                    >
                      {agent.website}
                    </a>
                  ) : (
                    <span className="text-[#71717A]">Not provided</span>
                  )}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => startEditing('website', agent.website || '')}
                    className="px-2.5 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[11px] font-semibold text-[#16281D] transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* AI Balance */}
          <div className="py-3.5 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-[#71717A] block">
                AI Inference Quota
              </span>
              <span className="text-[11px] text-[#71717A]">
                Dedicated AI query token pool
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-[#16281D]">
                ${agent.ai_balance ? Number(agent.ai_balance).toFixed(1) : '4.0'} USD
              </span>
              <span className="text-[10px] font-semibold text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full">
                Admin Managed
              </span>
            </div>
          </div>

          {/* WhatsApp Marketing Message Credits */}
          <div className="py-3.5 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-[#71717A] block">
                WhatsApp Marketing Credits
              </span>
              <span className="text-[11px] text-[#71717A]">
                Rs. 30 per template message (10 msgs = Rs. 300)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-[#059669]">
                Rs. {Math.round(Number(agent.credits ?? 300))}
              </span>
              <span className="text-[10px] font-semibold text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full">
                Admin Managed
              </span>
            </div>
          </div>

          {/* Normal SMS Marketing Credits */}
          <div className="py-3.5 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-[#71717A] block">
                SMS Marketing Credits
              </span>
              <span className="text-[11px] text-[#71717A]">
                Rs. 1 per SMS (100 SMS = Rs. 100)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-[#2563EB]">
                Rs. {Math.round(Number(agent.sms_credits ?? 100))}
              </span>
              <span className="text-[10px] font-semibold text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full">
                Admin Managed
              </span>
            </div>
          </div>

          {/* Invoice Background Template */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-semibold text-[#16281D] block">
                  Invoice Branding Template
                </span>
                <span className="text-[11px] text-[#71717A]">
                  Full-page branded background template for PDF receipts
                </span>
              </div>
              <button
                type="button"
                onClick={onDownloadMarginGuide}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] text-[11px] font-semibold transition-colors"
              >
                <Download size={12} /> Margin Guide
              </button>
            </div>

            {editingTemplate ? (
              <div className="p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] space-y-3 mt-2">
                <label className="flex items-center justify-center gap-2 p-4 bg-white border border-dashed border-[#EAEAEA] hover:border-[#16281D] rounded-xl cursor-pointer transition-colors">
                  <Upload size={14} className="text-[#71717A]" />
                  <span className="text-xs font-medium text-[#16281D]">
                    {selectedFile ? selectedFile.name : 'Choose template (PNG, JPG)'}
                  </span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-[#EAEAEA] hover:bg-[#EAEAEA] text-xs font-semibold text-[#71717A] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFileSubmit}
                    disabled={!selectedFile || uploadingTemplate}
                    className="px-4 py-1.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors disabled:opacity-50"
                  >
                    {uploadingTemplate ? 'Uploading...' : 'Upload Template'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] mt-2">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-[#71717A]" />
                  <span className="text-xs font-medium text-[#16281D]">
                    {agent.invoice_template_path
                      ? 'Branded template is active'
                      : 'No custom template configured'}
                  </span>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(true)}
                      className="px-3 py-1 rounded-full bg-white border border-[#EAEAEA] hover:border-[#16281D] text-[11px] font-semibold text-[#16281D] transition-colors"
                    >
                      {agent.invoice_template_path ? 'Replace' : 'Upload'}
                    </button>
                    {agent.invoice_template_path && (
                      <button
                        type="button"
                        onClick={onRemoveTemplate}
                        className="px-3 py-1 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[11px] font-semibold text-[#EF4444] transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoCard;
