import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, Search, Check } from 'lucide-react';
import Portal from '../../shared/Portal';
import { CustomerGroup, Customer } from '../CustomerTypes';
import { createCustomerGroup, updateCustomerGroup, fetchAllCustomers } from './customerGroupsApi';
import { useDialog } from '../../shared/DialogProvider';
import { RoundCheckbox } from '../../shared/RoundCheckbox';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (group: CustomerGroup) => void;
  editingGroup?: CustomerGroup | null;
  allCustomers?: Customer[];
}

const COLOR_PRESETS = [
  { hex: '#22C55E', label: 'Green' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#06B6D4', label: 'Cyan' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#6366F1', label: 'Indigo' },
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingGroup,
  allCustomers = [],
}) => {
  const { toast } = useDialog();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#22C55E');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resilient customer loading
  const [internalCustomers, setInternalCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const customerList = allCustomers.length > 0 ? allCustomers : internalCustomers;

  const isEditing = Boolean(editingGroup);

  useEffect(() => {
    if (isOpen && !isEditing && customerList.length === 0) {
      setLoadingCustomers(true);
      fetchAllCustomers()
        .then((custs) => setInternalCustomers(custs))
        .catch(() => {})
        .finally(() => setLoadingCustomers(false));
    }
  }, [isOpen, isEditing, customerList.length]);

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setDescription(editingGroup.description || '');
      setColor(editingGroup.color || '#22C55E');
      setSelectedCustomerIds([]);
    } else {
      setName('');
      setDescription('');
      setColor('#22C55E');
      setSelectedCustomerIds([]);
    }
    setCustomerSearch('');
  }, [editingGroup, isOpen]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customerList;
    return customerList.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [customerList, customerSearch]);

  const toggleSelectCustomer = (id: number) => {
    const numId = Number(id);
    setSelectedCustomerIds(prev =>
      prev.includes(numId) ? prev.filter(item => item !== numId) : [...prev, numId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast('Group name is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && editingGroup) {
        const res = await updateCustomerGroup({
          id: editingGroup.id,
          name: trimmedName,
          description: description.trim() || undefined,
          color,
        });
        toast(res.message || 'Group updated', 'success');
        onSaved(res.group);
      } else {
        const res = await createCustomerGroup({
          name: trimmedName,
          description: description.trim() || undefined,
          color,
          customer_ids: selectedCustomerIds,
        });
        toast(res.message || 'Group created', 'success');
        onSaved(res.group);
      }
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to save group', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] bg-[#16281D]/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-modal-backdrop font-sans select-none">
        <div
          className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_24px_60px_rgba(22,40,29,0.18)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-dropdown"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-[#F4F7F4]/40">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                style={{ background: `${color}18`, color }}
              >
                <Users size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#16281D]">
                  {isEditing ? 'Edit Customer Group' : 'Create Customer Group'}
                </h3>
                <p className="text-[11px] text-[#71717A]">
                  {isEditing ? 'Update group name, description and badge color' : 'Segment customers into a targeted audience group'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full border border-[#EAEAEA] bg-white text-[#71717A] hover:text-[#16281D] hover:bg-[#EAEAEA] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 no-scrollbar">
            {/* Group Name */}
            <div>
              <label className="block text-xs font-bold text-[#16281D] mb-1.5">
                Group Name <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VIP Wholesale, Colombo Area, Follow-up"
                maxLength={80}
                required
                disabled={editingGroup?.is_default}
                className="w-full px-3.5 py-2.5 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#A1A1AA] outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/25 transition-all disabled:bg-[#F4F7F4] disabled:text-[#71717A] disabled:cursor-not-allowed"
              />
              {editingGroup?.is_default && (
                <p className="text-[10px] text-[#71717A] mt-1">
                  Default lead stage group names are managed by the CRM system.
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#16281D] mb-1.5">
                Description <span className="text-[#71717A] font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief notes describing this customer segment…"
                rows={2}
                maxLength={200}
                className="w-full px-3.5 py-2 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#A1A1AA] outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/25 transition-all resize-none"
              />
            </div>

            {/* Color Tag Picker */}
            <div>
              <label className="block text-xs font-bold text-[#16281D] mb-2">
                Badge Color Accent
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {COLOR_PRESETS.map((p) => {
                  const isSelected = color === p.hex;
                  return (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setColor(p.hex)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected ? 'ring-2 ring-offset-2 ring-[#16281D] scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.label}
                    >
                      {isSelected && <Check size={13} className="text-white drop-shadow-xs" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Picker (Only on create or if customers exist) */}
            {!isEditing && (customerList.length > 0 || loadingCustomers) && (
              <div className="pt-2 border-t border-[#EAEAEA]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#16281D]">
                    Assign Initial Customers
                  </label>
                  <div className="flex items-center gap-2">
                    {filteredCustomers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedCustomerIds.length === filteredCustomers.length) {
                            setSelectedCustomerIds([]);
                          } else {
                            setSelectedCustomerIds(filteredCustomers.map(c => Number(c.id)));
                          }
                        }}
                        className="text-[11px] font-semibold text-[#16281D] hover:underline cursor-pointer"
                      >
                        {selectedCustomerIds.length === filteredCustomers.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                    <span className="text-[11px] font-mono font-semibold text-[#71717A]">
                      {selectedCustomerIds.length} selected
                    </span>
                  </div>
                </div>

                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name or phone…"
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#A1A1AA] outline-none focus:border-[#9FE870]"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto border border-[#EAEAEA] rounded-xl divide-y divide-[#EAEAEA]/70 bg-white">
                  {loadingCustomers ? (
                    <div className="p-4 text-center text-xs text-[#71717A] flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#16281D] border-t-transparent rounded-full animate-spin" />
                      <span>Loading customers from CRM…</span>
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#71717A]">
                      {customerSearch ? 'No matching customers found' : 'No customers found'}
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const customerId = Number(customer.id);
                      const isSelected = selectedCustomerIds.includes(customerId);
                      return (
                        <div
                          key={customer.id}
                          onClick={() => toggleSelectCustomer(customerId)}
                          className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#F0FDF4]' : 'hover:bg-[#F4F7F4]/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <RoundCheckbox
                              checked={isSelected}
                              onChange={() => toggleSelectCustomer(customerId)}
                            />
                            <div className="truncate">
                              <span className="font-semibold text-[#16281D]">{customer.name || 'Unnamed Customer'}</span>
                              {customer.phone && (
                                <span className="ml-2 font-mono text-[11px] text-[#71717A]">{customer.phone}</span>
                              )}
                            </div>
                          </div>
                          {customer.lead_stage && (
                            <span className="text-[10px] font-semibold text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full border border-[#EAEAEA] shrink-0">
                              {customer.lead_stage}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-full border border-[#EAEAEA] bg-white text-xs font-semibold text-[#71717A] hover:bg-[#F4F7F4] hover:text-[#16281D] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-5 py-2 rounded-full bg-[#16281D] text-[#9FE870] hover:bg-[#16281D]/90 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default CreateGroupModal;
