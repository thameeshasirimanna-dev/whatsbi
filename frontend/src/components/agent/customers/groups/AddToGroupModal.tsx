import React, { useState } from 'react';
import { X, Users, Check, Plus } from 'lucide-react';
import Portal from '../../shared/Portal';
import { CustomerGroup } from '../CustomerTypes';
import { addCustomersToGroup } from './customerGroupsApi';
import { useDialog } from '../../shared/DialogProvider';

interface AddToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomerIds: number[];
  groups: CustomerGroup[];
  onAdded: () => void;
  onCreateNewGroup: () => void;
}

export const AddToGroupModal: React.FC<AddToGroupModalProps> = ({
  isOpen,
  onClose,
  selectedCustomerIds,
  groups,
  onAdded,
  onCreateNewGroup,
}) => {
  const { toast } = useDialog();
  const assignableGroups = groups.filter((g) => g.name.toLowerCase() !== 'within 24h active');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    assignableGroups.length > 0 ? assignableGroups[0].id : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) {
      toast('Please select a customer group', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await addCustomersToGroup(selectedGroupId, selectedCustomerIds);
      toast(res.message || 'Customers added to group', 'success');
      onAdded();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to add customers to group', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] bg-[#16281D]/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-modal-backdrop font-sans select-none">
        <div
          className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-2xl w-full max-w-md overflow-hidden animate-dropdown"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between bg-[#F4F7F4]/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center shrink-0">
                <Users size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#16281D]">Add to Customer Group</h3>
                <p className="text-[11px] text-[#71717A]">
                  Assign {selectedCustomerIds.length} customer(s) to a group
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#EAEAEA] bg-white text-[#71717A] hover:text-[#16281D] hover:bg-[#EAEAEA] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {assignableGroups.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-[#71717A] mb-3">No customer groups exist yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateNewGroup();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#16281D] text-[#9FE870] text-xs font-bold cursor-pointer"
                >
                  <Plus size={13} />
                  Create First Group
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#16281D] mb-2">
                    Select Target Group
                  </label>
                  <div className="max-h-56 overflow-y-auto border border-[#EAEAEA] rounded-2xl divide-y divide-[#EAEAEA]/80">
                    {assignableGroups.map((group) => {
                      const isSelected = selectedGroupId === group.id;
                      return (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#F0FDF4]' : 'hover:bg-[#F4F7F4]/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: group.color }}
                            />
                            <div className="truncate">
                              <span className="font-bold text-[#16281D]">{group.name}</span>
                              {group.description && (
                                <span className="block text-[11px] text-[#71717A] truncate">
                                  {group.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[11px] text-[#71717A]">
                              {group.member_count} member{group.member_count === 1 ? '' : 's'}
                            </span>
                            {isSelected && <Check size={14} className="text-[#22C55E]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#EAEAEA]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreateNewGroup();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#16281D] hover:underline cursor-pointer"
                  >
                    <Plus size={12} />
                    Create New Group
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-full border border-[#EAEAEA] text-xs font-semibold text-[#71717A] hover:bg-[#F4F7F4]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedGroupId}
                      className="px-5 py-1.5 rounded-full bg-[#16281D] text-[#9FE870] text-xs font-bold disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {isSubmitting ? 'Adding…' : 'Add to Group'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default AddToGroupModal;
