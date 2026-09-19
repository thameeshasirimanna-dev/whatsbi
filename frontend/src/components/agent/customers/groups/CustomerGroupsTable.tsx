import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Copy,
  Check,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { CustomerGroup, thCell, PJS, MONO } from '../CustomerTypes';
import { GroupActionMenu } from './GroupActionMenu';
import { EmptyTableState } from '../../shared/EmptyTableState';

interface CustomerGroupsTableProps {
  groups: CustomerGroup[];
  totalGroupsCount: number;
  searchTerm: string;
  copiedGroupId: number | null;
  onEdit: (group: CustomerGroup) => void;
  onDelete: (group: CustomerGroup) => void;
  onCopyPhones: (group: CustomerGroup) => void;
  onViewMembers: (group: CustomerGroup) => void;
  onCreateGroup: () => void;
}

const getStageBadge = (group: CustomerGroup) => {
  if (!group.is_default) {
    return {
      label: 'Custom Group',
      bg: 'bg-[#F4F7F4]',
      text: 'text-[#71717A]',
      border: 'border-[#EAEAEA]',
    };
  }
  const name = group.name;
  if (['New Lead', 'Contacted', 'Follow-up Needed', 'Not Responding'].includes(name)) {
    return {
      label: 'Lead Stage',
      bg: 'bg-[#DBEAFE]',
      text: 'text-[#1D4ED8]',
      border: 'border-[#3B82F6]/20',
    };
  }
  if (['Interested', 'Quotation Sent', 'Asked for More Info'].includes(name)) {
    return {
      label: 'Interest Stage',
      bg: 'bg-[#FEF3C7]',
      text: 'text-[#B45309]',
      border: 'border-[#F59E0B]/20',
    };
  }
  if (['Payment Pending', 'Paid', 'Order Confirmed'].includes(name)) {
    return {
      label: 'Conversion Stage',
      bg: 'bg-[#DCFCE7]',
      text: 'text-[#15803D]',
      border: 'border-[#22C55E]/20',
    };
  }
  return {
    label: 'Pipeline Stage',
    bg: 'bg-[#F4F7F4]',
    text: 'text-[#16281D]',
    border: 'border-[#EAEAEA]',
  };
};

export const CustomerGroupsTable: React.FC<CustomerGroupsTableProps> = ({
  groups,
  totalGroupsCount,
  searchTerm,
  copiedGroupId,
  onEdit,
  onDelete,
  onCopyPhones,
  onViewMembers,
  onCreateGroup,
}) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #EAEAEA',
        boxShadow: '0 4px 20px rgba(22,40,29,0.03)',
        overflow: 'hidden',
      }}
      className="w-full font-sans"
    >
      {totalGroupsCount === 0 && !searchTerm ? (
        <EmptyTableState
          icon={Layers}
          title="No customer groups yet"
          description="Segment and organize your customers into automated pipeline groups or targeted custom groups."
          actionLabel="Create Group"
          onAction={onCreateGroup}
        />
      ) : groups.length === 0 ? (
        <EmptyTableState
          isFiltered
          filteredTitle="No groups found"
          filteredMessage={
            searchTerm
              ? `No customer groups match "${searchTerm}".`
              : 'No customer groups match your current filter.'
          }
        />
      ) : (
        <>
          {/* Mobile & Tablet Card List Layout */}
          <div className="block lg:hidden">
            <div className="flex flex-col divide-y divide-[#EAEAEA]">
              {groups.map((group) => {
                const badge = getStageBadge(group);
                const isCopied = copiedGroupId === group.id;

                return (
                  <div key={group.id} className="p-4 flex flex-col gap-3 hover:bg-[#F4F7F4]/50 transition-colors">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                          style={{ background: `${group.color}18`, color: group.color }}
                        >
                          <Users size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-[#16281D] truncate">{group.name}</h4>
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: group.color }}
                            />
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text} border ${badge.border} shrink-0`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#71717A]">
                            {group.member_count} {group.member_count === 1 ? 'contact' : 'contacts'}
                          </span>
                        </div>
                      </div>

                      <GroupActionMenu
                        group={group}
                        isCopied={isCopied}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onCopyPhones={onCopyPhones}
                        onViewMembers={onViewMembers}
                      />
                    </div>

                    {group.description && (
                      <p className="text-xs text-[#71717A] line-clamp-2 leading-relaxed pl-12.5">
                        {group.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {/* Avatar preview stack */}
                      <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5">
                        {group.preview_members && group.preview_members.length > 0 ? (
                          group.preview_members.slice(0, 3).map((m, idx) => (
                            <div
                              key={m.id || idx}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#16281D] text-[#9FE870] font-bold text-[10px] flex items-center justify-center shrink-0"
                              title={m.name}
                            >
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#A1A1AA]">No contacts</span>
                        )}
                        {group.member_count > 3 && (
                          <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#F4F7F4] text-[#71717A] font-bold font-mono text-[9px] flex items-center justify-center shrink-0">
                            +{group.member_count - 3}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onViewMembers(group)}
                          className="rounded-full h-8 px-3 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] text-xs font-bold border border-[#EAEAEA] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Users size={12} />
                          <span>Members</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopyPhones(group)}
                          className="rounded-full h-8 px-3 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] text-xs font-bold border-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block w-full overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ ...thCell, width: '28%' }}>Group Name</th>
                  <th style={{ ...thCell, width: '18%' }}>Pipeline Phase</th>
                  <th style={{ ...thCell, width: '18%' }}>Contacts</th>
                  <th style={{ ...thCell, width: '20%' }}>Description</th>
                  <th style={{ ...thCell, textAlign: 'right', width: '16%', minWidth: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const badge = getStageBadge(group);
                  const isCopied = copiedGroupId === group.id;

                  return (
                    <tr
                      key={group.id}
                      style={{
                        borderBottom: '1px solid #EAEAEA',
                        transition: 'background 0.12s ease',
                      }}
                      className="hover:bg-[#F4F7F4]/60 transition-colors"
                    >
                      {/* Group Name & Icon */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              background: `${group.color}18`,
                              color: group.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Users size={17} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  ...PJS,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#16281D',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={group.name}
                              >
                                {group.name}
                              </span>
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  backgroundColor: group.color,
                                  flexShrink: 0,
                                }}
                              />
                            </div>
                            <span style={{ ...MONO, fontSize: 11, color: '#71717A', marginTop: 2 }}>
                              Created {new Date(group.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Pipeline Stage / Type Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text} border ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Contacts & Avatars */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-3">
                          <span style={{ ...MONO, fontSize: 13, fontWeight: 700, color: '#16281D' }}>
                            {group.member_count}
                          </span>
                          <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5">
                            {group.preview_members && group.preview_members.length > 0 ? (
                              group.preview_members.slice(0, 3).map((m, idx) => (
                                <div
                                  key={m.id || idx}
                                  className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#16281D] text-[#9FE870] font-bold text-[10px] flex items-center justify-center shrink-0"
                                  title={m.name}
                                >
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                              ))
                            ) : null}
                            {group.member_count > 3 && (
                              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#F4F7F4] text-[#71717A] font-bold font-mono text-[9px] flex items-center justify-center shrink-0">
                                +{group.member_count - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '12px 16px', maxWidth: 280 }}>
                        <p className="text-xs text-[#71717A] truncate" title={group.description || 'No description'}>
                          {group.description || <span className="text-[#A1A1AA] italic">—</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            title="View & manage members"
                            onClick={() => onViewMembers(group)}
                            className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] text-xs font-bold border border-[#EAEAEA] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Users size={12} />
                            <span>Members</span>
                          </button>

                          <button
                            type="button"
                            title="Copy phone numbers"
                            onClick={() => onCopyPhones(group)}
                            className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] text-xs font-bold border-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            title="Filter in CRM table"
                            onClick={() => navigate(`/agent/customers?groupId=${group.id}`)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#EAEAEA] bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <ExternalLink size={13} />
                          </button>

                          <GroupActionMenu
                            group={group}
                            isCopied={isCopied}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onCopyPhones={onCopyPhones}
                            onViewMembers={onViewMembers}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerGroupsTable;
