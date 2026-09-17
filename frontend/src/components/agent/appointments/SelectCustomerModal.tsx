import React, { useState } from 'react';
import { Users, Search, X } from 'lucide-react';
import Portal from '../shared/Portal';

interface SelectCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
  onSelectCustomer: (customer: any) => void;
}

const SelectCustomerModal: React.FC<SelectCustomerModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSelectCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredCustomers = searchQuery.trim() === ''
    ? customers
    : customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone?.includes(searchQuery)
      );

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const handleSelect = (customer: any) => {
    setSearchQuery('');
    onSelectCustomer(customer);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col max-h-[80vh] animate-modal-card">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#16281D]/5 flex items-center justify-center text-[#16281D]">
                <Users size={18} />
              </div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">Select Customer</h3>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-[#EAEAEA] shrink-0 bg-white">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone…"
                autoFocus
                className="w-full h-10 pl-9 pr-4 bg-[#F4F7F4] border border-[#EAEAEA] rounded-full text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#71717A]">
                {customers.length === 0 ? 'No customers available.' : 'No customers match your search.'}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F4F7F4] transition-colors text-left cursor-pointer border border-transparent hover:border-[#EAEAEA] group"
                >
                  <div className="w-9 h-9 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center text-xs font-bold shrink-0">
                    {customer.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#16281D] truncate group-hover:text-[#16281D]">
                      {customer.name}
                    </div>
                    <div className="font-mono text-[11px] text-[#71717A] mt-0.5 truncate">
                      {customer.phone || 'No phone'}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default SelectCustomerModal;
