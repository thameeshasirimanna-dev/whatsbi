import React from "react";
import { X, FileText, AlertCircle } from "lucide-react";
import { GenerateInvoiceModalProps } from "./types";
import { SYNE, DM, inputStyle, onFocusGreen, onBlurGreen } from "./constants";
import { useDialog } from "../../shared/DialogProvider";
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #ebebeb",
          boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: "min(680px, 90vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            padding: "18px 24px 14px",
            borderBottom: "1px solid #ebebeb",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(34,197,94,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={15} style={{ color: "#059669" }} />
              </div>
              <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: "#0c1a0e" }}>
                Generate Invoice
              </span>
            </div>
            <span style={{ ...DM, fontSize: 12, color: "#71717a", marginTop: 4, display: "block" }}>
              Create and dispatch an invoice first. Order will be automatically created once paid.
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              background: "rgba(0,0,0,0.06)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#71717a",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(244,63,94,0.08)",
                border: "1px solid rgba(244,63,94,0.15)",
                borderRadius: 9,
                ...DM,
                fontSize: 13,
                color: "#f43f5e",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Customer info & Invoice title */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
                Invoice Title
              </label>
              <input
                type="text"
                value={invoiceName}
                onChange={(e) => setInvoiceName(e.target.value)}
                placeholder="Invoice name"
                style={inputStyle}
                onFocus={onFocusGreen}
                onBlur={onBlurGreen}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
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
                style={inputStyle}
                onFocus={onFocusGreen}
                onBlur={onBlurGreen}
              />
            </div>

            <div>
              <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
                Advance Amount Required (LKR)
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
                style={inputStyle}
                onFocus={onFocusGreen}
                onBlur={onBlurGreen}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
              Notes & Terms
            </label>
            <textarea
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="Payment instructions, bank accounts, delivery expectations..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={onFocusGreen as any}
              onBlur={onBlurGreen as any}
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

        {/* Footer Actions */}
        <div
          style={{
            flexShrink: 0,
            padding: "14px 24px",
            borderTop: "1px solid #ebebeb",
            display: "flex",
            gap: 12,
            background: "#fff",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "rgba(0,0,0,0.06)",
              color: "#3f3f46",
              border: "none",
              borderRadius: 10,
              cursor: generating ? "not-allowed" : "pointer",
              ...DM,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={generating || !invoiceName.trim()}
            style={{
              flex: 2,
              padding: "10px 20px",
              background:
                generating || !invoiceName.trim()
                  ? "rgba(34,197,94,0.3)"
                  : "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: generating || !invoiceName.trim() ? "not-allowed" : "pointer",
              ...DM,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: generating || !invoiceName.trim() ? "none" : "0 4px 14px rgba(34,197,94,0.25)",
            }}
          >
            <FileText size={15} />
            {generating ? "Generating & Saving..." : "Generate & Save Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateInvoiceModal;
