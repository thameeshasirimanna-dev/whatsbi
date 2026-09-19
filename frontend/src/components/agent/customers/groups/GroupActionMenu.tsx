import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Copy,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { CustomerGroup } from '../CustomerTypes';

interface GroupActionMenuProps {
  group: CustomerGroup;
  isCopied: boolean;
  onEdit: (group: CustomerGroup) => void;
  onDelete: (group: CustomerGroup) => void;
  onCopyPhones: (group: CustomerGroup) => void;
  onViewMembers: (group: CustomerGroup) => void;
  align?: 'right' | 'left';
}

export const GroupActionMenu: React.FC<GroupActionMenuProps> = ({
  group,
  isCopied,
  onEdit,
  onDelete,
  onCopyPhones,
  onViewMembers,
  align = 'right',
}) => {
  const navigate = useNavigate();

  return (
    <Menu as="div" className="relative inline-block text-left shrink-0">
      {({ open }) => (
        <>
          <Menu.Button
            className={`w-8 h-8 rounded-full border transition-all duration-150 flex items-center justify-center cursor-pointer ${
              open
                ? 'bg-[#16281D] text-[#9FE870] border-[#16281D] shadow-sm'
                : 'border-[#EAEAEA] bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D]'
            }`}
            title="Group Actions"
          >
            <MoreVertical size={14} />
          </Menu.Button>

          <Transition
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className={`absolute ${
                align === 'left' ? 'left-0' : 'right-0'
              } mt-1.5 w-48 sm:w-52 bg-white border border-[#EAEAEA] rounded-2xl shadow-[0_16px_40px_rgba(22,40,29,0.16)] z-[70] p-1.5 outline-none font-sans select-none`}
            >
              {/* 1. View Members */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => onViewMembers(group)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      active ? 'bg-[#F4F7F4] text-[#16281D]' : 'text-[#71717A]'
                    }`}
                  >
                    <Users size={14} className="shrink-0 text-[#16281D]" />
                    <span className="flex-1">View Members</span>
                    <span className="font-mono text-[11px] text-[#A1A1AA]">{group.member_count}</span>
                  </button>
                )}
              </Menu.Item>

              {/* 2. Copy Contact Numbers */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => onCopyPhones(group)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      active ? 'bg-[#F4F7F4] text-[#16281D]' : 'text-[#71717A]'
                    }`}
                  >
                    {isCopied ? (
                      <Check size={14} className="shrink-0 text-[#22C55E]" />
                    ) : (
                      <Copy size={14} className="shrink-0 text-[#71717A]" />
                    )}
                    <span className="flex-1">{isCopied ? 'Phones Copied!' : 'Copy Numbers'}</span>
                  </button>
                )}
              </Menu.Item>

              {/* 3. Filter in CRM Table */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => navigate(`/agent/customers?groupId=${group.id}`)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      active ? 'bg-[#F4F7F4] text-[#16281D]' : 'text-[#71717A]'
                    }`}
                  >
                    <ExternalLink size={14} className="shrink-0 text-[#71717A]" />
                    <span className="flex-1">Filter in CRM</span>
                  </button>
                )}
              </Menu.Item>

              {/* Divider */}
              <div className="my-1 border-t border-[#EAEAEA]" />

              {/* 4. Edit Group */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => onEdit(group)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      active ? 'bg-[#F4F7F4] text-[#16281D]' : 'text-[#71717A]'
                    }`}
                  >
                    <Pencil size={14} className="shrink-0 text-[#71717A]" />
                    <span className="flex-1">{group.is_default ? 'Customize Appearance' : 'Edit Group'}</span>
                  </button>
                )}
              </Menu.Item>

              {/* 5. Delete Group (Custom only) */}
              {!group.is_default && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => onDelete(group)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EF4444] transition-colors cursor-pointer text-left ${
                        active ? 'bg-[#EF4444]/10 text-[#DC2626]' : 'text-[#EF4444]'
                      }`}
                    >
                      <Trash2 size={14} className="shrink-0 text-[#EF4444]" />
                      <span className="flex-1">Delete Group</span>
                    </button>
                  )}
                </Menu.Item>
              )}
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default GroupActionMenu;
