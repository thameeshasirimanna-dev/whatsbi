import React, { useState } from 'react';
import { Users, UserPlus, Trash2, X, Shield, Mail, Check, AlertCircle } from 'lucide-react';
import Portal from '../shared/Portal';
import { EmptyTableState } from '../shared/EmptyTableState';
import type { TeamMember } from './types';

interface TeamManagementCardProps {
  teamMembers: TeamMember[];
  teamLoading: boolean;
  teamError: string;
  onAddMember: (name: string, email: string, pass: string) => Promise<void>;
  onDeleteMember: (userId: string) => Promise<void>;
  addingMember: boolean;
  addMemberError: string;
  addMemberSuccess: string;
}

const TeamManagementCard: React.FC<TeamManagementCardProps> = ({
  teamMembers,
  teamLoading,
  teamError,
  onAddMember,
  onDeleteMember,
  addingMember,
  addMemberError,
  addMemberSuccess,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddMember(name, email, password);
    if (!addMemberError) {
      setName('');
      setEmail('');
      setPassword('');
      setTimeout(() => setShowModal(false), 1200);
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EAEAEA] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/10 text-[#D97706] flex items-center justify-center font-bold">
            <Users size={18} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
              Access & Organization
            </span>
            <h3 className="text-base font-bold text-[#16281D]">Team Members & Access</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowModal(true);
          }}
          className="w-full sm:w-auto px-5 py-2.5 h-10 rounded-full bg-[#16281D] hover:bg-[#1f3829] text-[#9FE870] font-sans text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus size={15} /> Add Team Member
        </button>
      </div>

      {teamError && (
        <div className="mb-5 p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444]">
          {teamError}
        </div>
      )}

      {teamLoading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-[#16281D]/20 border-t-[#16281D] animate-spin" />
        </div>
      ) : teamMembers.length === 0 ? (
        <EmptyTableState
          icon={Users}
          title="No team members yet"
          description="Invite team members to help manage customer chats, orders, and services."
          actionLabel="Add Team Member"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <>
          {/* Mobile View */}
          <div className="block lg:hidden divide-y divide-[#EAEAEA]">
            {teamMembers.map((member) => (
              <div key={member.id} className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#16281D]">{member.name}</h4>
                    <p className="text-[11px] font-mono text-[#71717A]">{member.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                      member.is_owner
                        ? 'bg-[#9FE870]/25 text-[#16281D]'
                        : 'bg-[#F4F7F4] text-[#71717A] border border-[#EAEAEA]'
                    }`}
                  >
                    {member.is_owner ? 'Owner' : 'Agent'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1">
                  <span>{member.is_owner ? 'Account Owner' : 'Team Member'}</span>
                  {!member.is_owner && (
                    <button
                      type="button"
                      onClick={() => onDeleteMember(member.id)}
                      className="px-3 py-1 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[11px] font-semibold text-[#EF4444] transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EAEAEA] text-[#71717A] text-[11px] uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-2">Member</th>
                  <th className="pb-3 px-2">Email</th>
                  <th className="pb-3 px-2">Role</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F7F4]">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[#F4F7F4]/40 transition-colors">
                    <td className="py-3 px-2 font-semibold text-[#16281D]">{member.name}</td>
                    <td className="py-3 px-2 font-mono text-[#71717A]">{member.email}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                          member.is_owner
                            ? 'bg-[#9FE870]/25 text-[#16281D]'
                            : 'bg-[#F4F7F4] text-[#71717A] border border-[#EAEAEA]'
                        }`}
                      >
                        {member.is_owner ? 'Owner' : 'Agent'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {!member.is_owner && (
                        <button
                          type="button"
                          onClick={() => onDeleteMember(member.id)}
                          className="px-3 py-1 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[11px] font-semibold text-[#EF4444] transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-50 bg-[#16281D]/65 flex items-center justify-center p-2.5 sm:p-4 animate-modal-backdrop">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.15)] w-full max-w-[min(28rem,95vw)] sm:max-w-md overflow-hidden flex flex-col animate-modal-card">
              <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-[#EAEAEA] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 mr-2">
                  <div className="w-8 h-8 rounded-full bg-[#9FE870]/20 text-[#16281D] flex items-center justify-center shrink-0">
                    <UserPlus size={15} />
                  </div>
                  <h3 className="text-sm font-bold text-[#16281D] truncate">Add Team Member</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] flex items-center justify-center transition-colors shrink-0"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="w-full px-3.5 py-2.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white transition-all font-mono"
                  />
                </div>

                {addMemberError && (
                  <div className="p-3 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444]">
                    {addMemberError}
                  </div>
                )}

                {addMemberSuccess && (
                  <div className="p-3 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-xs text-[#15803D]">
                    {addMemberSuccess}
                  </div>
                )}

                <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto min-h-[38px] px-4 py-2 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-semibold text-[#71717A] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="w-full sm:w-auto min-h-[38px] px-5 py-2 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    {addingMember ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default TeamManagementCard;
