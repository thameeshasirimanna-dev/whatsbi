import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, Search, Copy, Check, UserMinus, UserPlus, MessageCircle } from 'lucide-react';
import Portal from '../../shared/Portal';
import { CustomerGroup, GroupMemberDetail, Customer } from '../CustomerTypes';
import { fetchGroupDetails, removeCustomersFromGroup, addCustomersToGroup, fetchAllCustomers } from './customerGroupsApi';
import { useDialog } from '../../shared/DialogProvider';
import { RoundCheckbox } from '../../shared/RoundCheckbox';

interface GroupMembersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  group: CustomerGroup | null;
  onMembershipChanged: () => void;
  allCustomers?: Customer[];
}

export const GroupMembersDrawer: React.FC<GroupMembersDrawerProps> = ({
  isOpen,
  onClose,
  group,
  onMembershipChanged,
  allCustomers = [],
}) => {
  const { toast, confirm: dlgConfirm } = useDialog();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<GroupMemberDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Add members sub-view
  const [showAddMode, setShowAddMode] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<number[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Resilient customer loading
  const [internalCustomers, setInternalCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const customerList = allCustomers.length > 0 ? allCustomers : internalCustomers;

  const loadCustomerList = async () => {
    if (customerList.length > 0) return;
    try {
      setLoadingCustomers(true);
      const custs = await fetchAllCustomers();
      setInternalCustomers(custs);
    } catch {
      // ignore
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadMembers = async () => {
    if (!group) return;
    try {
      setLoading(true);
      const res = await fetchGroupDetails(group.id);
      setMembers(res.group.members || []);
    } catch (err: any) {
      toast(err.message || 'Failed to load group members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && group) {
      loadMembers();
      setShowAddMode(false);
      setSelectedToAdd([]);
      setSearchTerm('');
      setAddSearchTerm('');
      if (allCustomers.length === 0 && internalCustomers.length === 0) {
        loadCustomerList();
      }
    }
  }, [isOpen, group?.id, allCustomers.length]);

  useEffect(() => {
    if (isOpen && showAddMode && customerList.length === 0) {
      loadCustomerList();
    }
  }, [isOpen, showAddMode, customerList.length]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q)
    );
  }, [members, searchTerm]);

  // Customers in CRM that are NOT already in this group
  const existingMemberIds = useMemo(() => {
    return new Set(members.map(m => Number(m.id)));
  }, [members]);

  const availableToAdd = useMemo(() => {
    const q = addSearchTerm.trim().toLowerCase();
    return customerList.filter(c => {
      if (existingMemberIds.has(Number(c.id))) return false;
      if (!q) return true;
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q);
      return nameMatch || phoneMatch;
    });
  }, [customerList, existingMemberIds, addSearchTerm]);

  const handleCopyPhones = () => {
    if (members.length === 0) {
      toast('No members to copy', 'error');
      return;
    }
    const phoneList = members.map(m => m.phone).join('\n');
    navigator.clipboard.writeText(phoneList);
    setCopied(true);
    toast(`Copied ${members.length} phone number(s) to clipboard`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    const confirmMsg = group.is_default
      ? `Remove ${memberName} from "${group.name}"? Their CRM pipeline stage will be reset to "New Lead".`
      : `Remove ${memberName} from "${group.name}"?`;
    const ok = await dlgConfirm(confirmMsg);
    if (!ok) return;

    try {
      await removeCustomersFromGroup(group.id, [memberId]);
      toast(`Removed from ${group.name}`, 'success');
      setMembers(prev => prev.filter(m => m.id !== memberId));
      onMembershipChanged();
    } catch (err: any) {
      toast(err.message || 'Failed to remove member', 'error');
    }
  };

  const handleAddSelectedCustomers = async () => {
    if (selectedToAdd.length === 0) return;
    try {
      setIsAdding(true);
      await addCustomersToGroup(group.id, selectedToAdd);
      const successMsg = group.is_default
        ? `Updated ${selectedToAdd.length} customer(s) to "${group.name}"`
        : `Added ${selectedToAdd.length} customer(s) to ${group.name}`;
      toast(successMsg, 'success');
      setSelectedToAdd([]);
      setShowAddMode(false);
      await loadMembers();
      onMembershipChanged();
    } catch (err: any) {
      toast(err.message || 'Failed to add members', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[110] bg-[#16281D]/60 backdrop-blur-xs flex items-center justify-end font-sans select-none animate-fade-in cursor-pointer"
        onClick={onClose}
      >
        <div
          className="w-full sm:w-[460px] md:w-[500px] h-full bg-white border-l border-[#EAEAEA] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-[#F4F7F4]/40">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                style={{ background: `${group.color}18`, color: group.color }}
              >
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#16281D] truncate">{group.name}</h3>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.is_default && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16281D] text-[#9FE870] shrink-0">
                      Pipeline Stage
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#71717A]">
                  {members.length} {members.length === 1 ? 'member' : 'members'}
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

          {/* Automatic Sync Info Ribbon for Default Lead Stage Groups */}
          {group.is_default && (
            <div className="px-5 py-2 bg-[#F4F7F4] border-b border-[#EAEAEA] flex items-center gap-2 text-[11px] text-[#71717A]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0 animate-pulse" />
              <span>Automatically syncs when a customer's pipeline stage transitions to <strong>{group.name}</strong>.</span>
            </div>
          )}

          {/* Action Ribbon */}
          <div className="px-5 py-2.5 bg-[#F4F7F4] border-b border-[#EAEAEA] flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyPhones}
              disabled={members.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#EAEAEA] text-xs font-semibold text-[#16281D] transition-colors cursor-pointer disabled:opacity-50"
              title="Copy all member phone numbers"
            >
              {copied ? <Check size={12} className="text-[#22C55E]" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy Numbers'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddMode(!showAddMode)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#9FE870] bg-[#9FE870]/15 hover:bg-[#9FE870]/25 text-xs font-bold text-[#16281D] transition-colors cursor-pointer"
            >
              {showAddMode ? <Users size={12} /> : <UserPlus size={12} />}
              <span>{showAddMode ? 'View Members' : 'Add Members'}</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col min-h-0">
            {showAddMode ? (
              /* Add Members Sub-View */
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#16281D]">Select Customers to Add</span>
                  <div className="flex items-center gap-2">
                    {availableToAdd.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedToAdd.length === availableToAdd.length) {
                            setSelectedToAdd([]);
                          } else {
                            setSelectedToAdd(availableToAdd.map(c => Number(c.id)));
                          }
                        }}
                        className="text-[11px] font-semibold text-[#16281D] hover:underline cursor-pointer"
                      >
                        {selectedToAdd.length === availableToAdd.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                    <span className="text-xs font-mono font-semibold text-[#71717A]">
                      {selectedToAdd.length} selected
                    </span>
                  </div>
                </div>

                <div className="relative shrink-0">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                  <input
                    type="text"
                    value={addSearchTerm}
                    onChange={(e) => setAddSearchTerm(e.target.value)}
                    placeholder="Search available customers…"
                    className="w-full pl-8 pr-3 py-2 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#A1A1AA] outline-none focus:border-[#9FE870]"
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-[#EAEAEA] rounded-2xl divide-y divide-[#EAEAEA]/80 min-h-[220px]">
                  {loadingCustomers ? (
                    <div className="p-8 text-center text-xs text-[#71717A] flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#16281D] border-t-transparent rounded-full animate-spin" />
                      <span>Loading available customers…</span>
                    </div>
                  ) : availableToAdd.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#71717A]">
                      {addSearchTerm ? 'No matching customers found' : 'No available customers to add'}
                    </div>
                  ) : (
                    availableToAdd.map((customer) => {
                      const customerId = Number(customer.id);
                      const isSelected = selectedToAdd.includes(customerId);
                      return (
                        <div
                          key={customer.id}
                          onClick={() => {
                            setSelectedToAdd(prev =>
                              isSelected ? prev.filter(id => id !== customerId) : [...prev, customerId]
                            );
                          }}
                          className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#F0FDF4]' : 'hover:bg-[#F4F7F4]/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <RoundCheckbox
                              checked={isSelected}
                              onChange={() => {
                                setSelectedToAdd(prev =>
                                  isSelected ? prev.filter(id => id !== customerId) : [...prev, customerId]
                                );
                              }}
                            />
                            <div className="truncate">
                              <span className="font-semibold text-[#16281D]">{customer.name || 'Unnamed Customer'}</span>
                              {customer.phone && (
                                <span className="ml-2 font-mono text-[11px] text-[#71717A]">{customer.phone}</span>
                              )}
                            </div>
                          </div>
                          {customer.lead_stage && (
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAEAEA]/60 text-[#71717A]">
                              {customer.lead_stage}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddMode(false)}
                    className="px-4 py-1.5 rounded-full border border-[#EAEAEA] text-xs font-semibold text-[#71717A] hover:bg-[#F4F7F4]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelectedCustomers}
                    disabled={selectedToAdd.length === 0 || isAdding}
                    className="px-5 py-1.5 rounded-full bg-[#16281D] text-[#9FE870] text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isAdding ? 'Adding…' : `Add ${selectedToAdd.length} Member(s)`}
                  </button>
                </div>
              </div>
            ) : (
              /* Members List View */
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="relative shrink-0">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search group members…"
                    className="w-full pl-8 pr-3 py-2 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#A1A1AA] outline-none focus:border-[#9FE870]"
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-[#EAEAEA] rounded-2xl divide-y divide-[#EAEAEA]/80">
                  {loading ? (
                    <div className="p-8 text-center text-xs text-[#71717A]">
                      Loading members…
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#71717A]">
                      {searchTerm ? 'No matching members found' : 'No members in this group yet'}
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-[#F4F7F4]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] font-bold text-xs flex items-center justify-center shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-[#16281D] truncate">
                                {member.name}
                              </span>
                              {member.lead_stage && (
                                <span className="text-[10px] font-semibold text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full border border-[#EAEAEA] shrink-0">
                                  {member.lead_stage}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-[#71717A]">
                              {member.phone}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/agent/conversations?customerId=${member.id}`);
                            }}
                            title="Chat on WhatsApp"
                            className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <MessageCircle size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            title="Remove from group"
                            className="w-7 h-7 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <UserMinus size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default GroupMembersDrawer;
