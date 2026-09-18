import React from "react";
import { X, FileText, AlertCircle } from "lucide-react";
import { GenerateInvoiceModalProps } from "./types";
import { useDialog } from "../../shared/DialogProvider";
import Portal from "../../shared/Portal";
import { useInvoiceModal } from "./useInvoiceModal";
import { CustomerSelector } from "./CustomerSelector";
import { CatalogQuickAdd } from "./CatalogQuickAdd";
import { LineItemsEditor } from "./LineItemsEditor";
import { InvoiceSummaryCard } from "./InvoiceSummaryCard";

export const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = (props) => {
  const { isOpen, onClose } = props;
  const { toast } = useDialog();

  const {
    localCustomerId,
    localCustomerName,
    localCustomerPhone,
    customerSearchQuery,
    setCustomerSearchQuery,
    isCustomerDropdownOpen,
    setIsCustomerDropdownOpen,
    isSearchingCustomers,
    customerDropdownRef,
    customerInputRef,
    filteredCustomers,
    handleSelectCustomer,
    handleClearCustomer,

    invoiceName,
    setInvoiceName,
    items,
    handleItemChange,
    addItem,
    removeItem,
    handleQuickAdd,

    businessType,
    quickItems,

    discountPercentage,
    setDiscountPercentage,
    advanceAmount,
    setAdvanceAmount,
    setAdvanceModifiedManually,
    subtotal,
    discountAmount,
    total,
    balanceDue,

    invoiceNotes,
    setInvoiceNotes,
    generating,
    error,
    handleGenerateInvoice,
  } = useInvoiceModal({ ...props, toast });

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] bg-[#16281D]/65 flex items-center justify-center p-4 animate-modal-backdrop">
        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-card">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#16281D] text-[#9FE870] flex items-center justify-center">
              <FileText size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">
                Generate Invoice
              </h3>
              <p className="font-sans text-xs text-[#71717A] mt-0.5">
                Create and dispatch an invoice. An order will auto-create upon payment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717A] hover:text-[#16281D] transition-colors border-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs font-sans text-[#EF4444] flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Customer info & Invoice title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomerSelector
              localCustomerId={localCustomerId}
              localCustomerName={localCustomerName}
              localCustomerPhone={localCustomerPhone}
              propCustomerId={props.customerId}
              customerSearchQuery={customerSearchQuery}
              setCustomerSearchQuery={setCustomerSearchQuery}
              isCustomerDropdownOpen={isCustomerDropdownOpen}
              setIsCustomerDropdownOpen={setIsCustomerDropdownOpen}
              isSearchingCustomers={isSearchingCustomers}
              customerDropdownRef={customerDropdownRef}
              customerInputRef={customerInputRef}
              filteredCustomers={filteredCustomers}
              onSelectCustomer={handleSelectCustomer}
              onClearCustomer={handleClearCustomer}
            />

            <div>
              <label className="block text-xs font-semibold text-[#16281D] mb-1.5 font-sans">
                Invoice Title
              </label>
              <input
                type="text"
                value={invoiceName}
                onChange={(e) => setInvoiceName(e.target.value)}
                placeholder="Invoice name"
                className="w-full px-3.5 py-2 text-sm font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>

          {/* Catalog Quick Add */}
          <CatalogQuickAdd
            businessType={businessType}
            quickItems={quickItems}
            onQuickAdd={handleQuickAdd}
          />

          {/* Line Items Table */}
          <LineItemsEditor
            items={items}
            onItemChange={handleItemChange}
            onAddItem={addItem}
            onRemoveItem={removeItem}
          />

          {/* Financial Adjustments (Discount & Advance) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#16281D] mb-1.5 font-sans">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3.5 py-2 text-sm font-mono text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all placeholder:text-[#A1A1AA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#16281D] mb-1.5 font-sans">
                Advance Amount Required (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={advanceAmount}
                onChange={(e) => {
                  setAdvanceModifiedManually(true);
                  setAdvanceAmount(parseFloat(e.target.value) || 0);
                }}
                placeholder="Deposit / advance amount"
                className="w-full px-3.5 py-2 text-sm font-mono text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#16281D] mb-1.5 font-sans">
              Notes & Terms
            </label>
            <textarea
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="Payment instructions, bank accounts, delivery expectations..."
              rows={2}
              className="w-full px-3.5 py-2 text-sm font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all resize-y placeholder:text-[#A1A1AA]"
            />
          </div>

          {/* Real-time Summary Card */}
          <InvoiceSummaryCard
            subtotal={subtotal}
            discountPercentage={discountPercentage}
            discountAmount={discountAmount}
            total={total}
            advanceAmount={advanceAmount}
            balanceDue={balanceDue}
          />
        </div>

        {/* Footer Actions following Style Guide Section 6 */}
        <div className="shrink-0 p-4 border-t border-[#EAEAEA] bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="h-10 px-4 rounded-full bg-white border border-[#E4E4E7] hover:bg-[#F4F7F4] active:scale-[0.98] font-sans text-xs font-bold text-[#52525B] transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={generating || !invoiceName.trim()}
            className="h-10 px-5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_14px_rgba(159,232,112,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer border-0"
          >
            <FileText size={15} strokeWidth={2.4} />
            <span>{generating ? "Generating & Saving..." : "Generate & Save Invoice"}</span>
          </button>
        </div>
      </div>
    </div>
  </Portal>
);
};

export default GenerateInvoiceModal;
