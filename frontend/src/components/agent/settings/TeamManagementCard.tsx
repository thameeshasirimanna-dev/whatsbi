import React, { useState } from 'react';
import { Users, UserPlus, Trash2, X, Shield, Mail, Check, AlertCircle } from 'lucide-react';
import Portal from '../shared/Portal';
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
    <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-6 md:p-8">
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
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 self-start sm:self-auto"
        >
          <UserPlus size={14} /> Add Team Member
        </button>
      </div>

      {teamError && (
        <div className="mb-5 p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444]">
          {teamError}
        </div>
      )}

      {teamLoading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="w-6 h-6 rounded-full border-2 border-[#16281D]/10 border-t-[#16281D] animate-spin" />
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block lg:hidden divide-y divide-[#F4F7F4]">
            {teamMembers.map((member) => (
              <div key={member.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#16281D]">{member.name}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      member.is_owner
                        ? 'bg-[#22C55E]/10 text-[#15803D]'
                        : 'bg-[#3B82F6]/10 text-[#2563EB]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        member.is_owner ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'
                      }`}
                    />
                    {member.is_owner ? 'Owner' : 'Agent'}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#71717A] flex items-center gap-1.5">
                  <Mail size={12} /> {member.email}
                </div>
                {!member.is_owner && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => onDeleteMember(member.id)}
                      className="px-3 py-1 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[11px] font-semibold text-[#EF4444] transition-colors"
                    >
                      Remove Member
                    </button>
                  </div>
                )}
              </div>
            ))}
            {teamMembers.length === 0 && (
              <div className="py-8 text-center text-xs text-[#71717A]">
                No additional team members registered.
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#EAEAEA]">
                  <th className="pb-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                    Member Name
                  </th>
                  <th className="pb-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="pb-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="pb-3 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F7F4]">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[#F4F7F4]/50 transition-colors">
                    <td className="py-3.5 text-xs font-bold text-[#16281D]">
                      {member.name}
                    </td>
                    <td className="py-3.5 text-xs font-mono text-[#71717A]">
                      {member.email}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          member.is_owner
                            ? 'bg-[#22C55E]/10 text-[#15803D]'
                            : 'bg-[#3B82F6]/10 text-[#2563EB]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.is_owner ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'
                          }`}
                        />
                        {member.is_owner ? 'Owner' : 'Agent Member'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
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
                {teamMembers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-[#71717A]">
                      No additional team members registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-50 bg-[#16281D]/65 flex items-center justify-center p-4 animate-modal-backdrop">
            <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.15)] w-full max-w-md overflow-hidden flex flex-col animate-modal-card">
              <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#9FE870]/20 text-[#16281D] flex items-center justify-center">
                    <UserPlus size={15} />
                  </div>
                  <h3 className="text-sm font-bold text-[#16281D]">Add Team Member</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] flex items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                <div className="pt-2 flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-semibold text-[#71717A] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="px-5 py-2 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors shadow-sm disabled:opacity-50"
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
