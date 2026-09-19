import React from 'react';
import { Users, Copy, Check } from 'lucide-react';
import { CustomerGroup } from '../CustomerTypes';
import { GroupActionMenu } from './GroupActionMenu';

interface GroupCardProps {
  group: CustomerGroup;
  isCopied: boolean;
  onEdit: (group: CustomerGroup) => void;
  onDelete: (group: CustomerGroup) => void;
  onCopyPhones: (group: CustomerGroup) => void;
  onViewMembers: (group: CustomerGroup) => void;
}

const getStageBadge = (name: string) => {
  if (['New Lead', 'Contacted', 'Follow-up Needed', 'Not Responding'].includes(name)) {
    return { label: 'Lead Stage', bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]', border: 'border-[#3B82F6]/20' };
  }
  if (['Interested', 'Quotation Sent', 'Asked for More Info'].includes(name)) {
    return { label: 'Interest Stage', bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', border: 'border-[#F59E0B]/20' };
  }
  if (['Payment Pending', 'Paid', 'Order Confirmed'].includes(name)) {
    return { label: 'Conversion Stage', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]', border: 'border-[#22C55E]/20' };
  }
  return { label: 'Pipeline Stage', bg: 'bg-[#F4F7F4]', text: 'text-[#16281D]', border: 'border-[#EAEAEA]' };
};

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isCopied,
  onEdit,
  onDelete,
  onCopyPhones,
  onViewMembers,
}) => {
  const stageBadge = group.is_default ? getStageBadge(group.name) : null;

  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] hover:shadow-md hover:border-[#16281D]/20 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between gap-3.5">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ background: `${group.color}18`, color: group.color }}
            >
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-[15px] text-[#16281D] truncate" title={group.name}>
                  {group.name}
                </h3>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                {stageBadge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stageBadge.bg} ${stageBadge.text} border ${stageBadge.border} shrink-0`}>
                    {stageBadge.label}
                  </span>
                )}
              </div>
              <span className="font-mono text-xs font-semibold text-[#71717A]">
                {group.member_count} {group.member_count === 1 ? 'contact' : 'contacts'}
              </span>
            </div>
          </div>

          {/* Context Dropdown Menu */}
          <GroupActionMenu
            group={group}
            isCopied={isCopied}
            onEdit={onEdit}
            onDelete={onDelete}
            onCopyPhones={onCopyPhones}
            onViewMembers={onViewMembers}
          />
        </div>

        {/* Description */}
        {group.description ? (
          <p className="text-xs text-[#71717A] line-clamp-2 min-h-[32px] leading-relaxed">
            {group.description}
          </p>
        ) : (
          <p className="text-xs text-[#A1A1AA] italic min-h-[32px] leading-relaxed">
            No description provided
          </p>
        )}
      </div>

      {/* Member Avatars & Quick Actions */}
      <div className="pt-3.5 border-t border-[#EAEAEA] flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        {/* Avatar Stack */}
        <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5">
          {group.preview_members && group.preview_members.length > 0 ? (
            group.preview_members.map((m, idx) => (
              <div
                key={m.id || idx}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#16281D] text-[#9FE870] font-bold text-[10px] flex items-center justify-center shrink-0"
                title={m.name}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
            ))
          ) : (
            <span className="text-[11px] text-[#A1A1AA]">No contacts yet</span>
          )}
          {group.member_count > 4 && (
            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#F4F7F4] text-[#71717A] font-bold font-mono text-[9px] flex items-center justify-center shrink-0">
              +{group.member_count - 4}
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          <button
            onClick={() => onViewMembers(group)}
            className="rounded-full h-8 sm:h-9 px-3 sm:px-3.5 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#EAEAEA]"
            title="View & manage group members"
          >
            <Users size={12} />
            <span>Members</span>
          </button>

          <button
            onClick={() => onCopyPhones(group)}
            className="rounded-full h-8 sm:h-9 px-3 sm:px-3.5 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] font-sans text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-0"
            title="Copy all member phone numbers"
          >
            {isCopied ? <Check size={13} className="text-[#0284C7]" /> : <Copy size={12} />}
            <span>{isCopied ? 'Copied' : 'Copy Numbers'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
