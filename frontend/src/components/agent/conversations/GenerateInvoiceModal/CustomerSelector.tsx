import React from "react";
import { Search, ChevronDown, Check, Phone, X, Loader2 } from "lucide-react";
import { CustomerOption } from "./types";
import { inputStyle, onFocusGreen, onBlurGreen } from "./constants";

interface CustomerSelectorProps {
  localCustomerId: number | null;
  localCustomerName: string;
  localCustomerPhone: string | null;
  propCustomerId?: number | null;
  customerSearchQuery: string;
  setCustomerSearchQuery: (q: string) => void;
  isCustomerDropdownOpen: boolean;
  setIsCustomerDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSearchingCustomers?: boolean;
  customerDropdownRef: React.RefObject<HTMLDivElement>;
  customerInputRef: React.RefObject<HTMLInputElement>;
  filteredCustomers: CustomerOption[];
  onSelectCustomer: (cust: CustomerOption) => void;
  onClearCustomer: () => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  localCustomerId,
  localCustomerName,
  localCustomerPhone,
  propCustomerId,
  customerSearchQuery,
  setCustomerSearchQuery,
  isCustomerDropdownOpen,
  setIsCustomerDropdownOpen,
  isSearchingCustomers = false,
  customerDropdownRef,
  customerInputRef,
  filteredCustomers,
  onSelectCustomer,
  onClearCustomer,
}) => {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#16281D] mb-1.5 font-sans">
        Customer
      </label>
      {localCustomerId ? (
        <div className="w-full px-3 py-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-sans font-bold text-xs shrink-0">
              {(localCustomerName || "C").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-sans text-xs font-bold text-[#16281D] truncate">
                {localCustomerName}
              </span>
              {localCustomerPhone ? (
                <span className="font-mono text-[11px] text-[#71717A] flex items-center gap-1">
                  <Phone size={10} className="text-[#15803D] shrink-0" />
                  {localCustomerPhone}
                </span>
              ) : (
                <span className="font-sans text-[11px] text-[#A1A1AA]">No contact number</span>
              )}
            </div>
          </div>
          {!propCustomerId && (
            <button
              type="button"
              onClick={onClearCustomer}
              className="px-3 py-1 rounded-full bg-white/80 hover:bg-white text-[#71717A] hover:text-[#16281D] border border-[#EAEAEA] font-sans text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              title="Change customer"
            >
              <X size={11} /> Change
            </button>
          )}
        </div>
      ) : (
        <div
          ref={customerDropdownRef}
          className="relative"
          style={{ zIndex: isCustomerDropdownOpen ? 30 : 1 }}
        >
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none"
            />
            <input
              ref={customerInputRef}
              type="text"
              placeholder="Search name or contact number..."
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                setIsCustomerDropdownOpen(true);
              }}
              onFocus={() => setIsCustomerDropdownOpen(true)}
              onClick={() => setIsCustomerDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsCustomerDropdownOpen(false);
              }}
              className="w-full h-10 pl-9 pr-8 text-xs font-medium font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-full focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 outline-none transition-all placeholder:text-[#A1A1AA]"
            />
            {isSearchingCustomers ? (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#16281D] animate-spin"
              />
            ) : (
              <ChevronDown
                size={14}
                onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] cursor-pointer"
              />
            )}
          </div>

          {isCustomerDropdownOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white border border-[#EAEAEA] rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-[#F4F7F4]">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center font-sans text-xs text-[#71717A]">
                  {isSearchingCustomers
                    ? "Searching customers..."
                    : customerSearchQuery
                    ? `No customer found for "${customerSearchQuery}"`
                    : "No customers available"}
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectCustomer(c);
                    }}
                    className="w-full flex items-center justify-between gap-2.5 p-2.5 bg-transparent hover:bg-[#F0FDF4] transition-colors cursor-pointer border-0 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-sans font-bold text-xs shrink-0">
                        {(c.name || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-sans text-xs font-bold text-[#16281D] truncate">
                          {c.name}
                        </div>
                        <div className="font-mono text-[11px] text-[#71717A] flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="text-[#15803D] shrink-0" />
                          <span>{c.phone || "No contact number"}</span>
                        </div>
                      </div>
                    </div>
                    {c.id === localCustomerId && (
                      <Check size={14} className="text-[#15803D] shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
