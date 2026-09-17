import React from "react";
import { Search, ChevronDown, Check, Phone, X, Loader2 } from "lucide-react";
import { CustomerOption } from "./types";
import { SYNE, DM, inputStyle, onFocusGreen, onBlurGreen } from "./constants";

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
      <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 5 }}>
        Customer
      </label>
      {localCustomerId ? (
        <div
          style={{
            ...inputStyle,
            padding: "7px 12px",
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ ...SYNE, fontSize: 11, fontWeight: 700, color: "#fff" }}>
                {(localCustomerName || "C").charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  ...DM,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#059669",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {localCustomerName}
              </span>
              {localCustomerPhone ? (
                <span
                  style={{
                    ...DM,
                    fontSize: 11,
                    color: "#71717a",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Phone size={10} style={{ color: "#059669", flexShrink: 0 }} />
                  {localCustomerPhone}
                </span>
              ) : (
                <span style={{ ...DM, fontSize: 11, color: "#a1a1aa" }}>No contact number</span>
              )}
            </div>
          </div>
          {!propCustomerId && (
            <button
              type="button"
              onClick={onClearCustomer}
              style={{
                background: "rgba(0,0,0,0.05)",
                border: "none",
                borderRadius: 6,
                padding: "4px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                ...DM,
                fontSize: 11,
                color: "#71717a",
                flexShrink: 0,
              }}
              title="Change customer"
            >
              <X size={11} /> Change
            </button>
          )}
        </div>
      ) : (
        <div
          ref={customerDropdownRef}
          style={{
            position: "relative",
            zIndex: isCustomerDropdownOpen ? 30 : 1,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#a1a1aa",
                pointerEvents: "none",
              }}
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
              onFocus={() => {
                setIsCustomerDropdownOpen(true);
              }}
              onClick={() => {
                setIsCustomerDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsCustomerDropdownOpen(false);
                }
              }}
              style={{ ...inputStyle, paddingLeft: 30, paddingRight: 28 }}
              onFocusCapture={onFocusGreen as any}
              onBlurCapture={onBlurGreen as any}
            />
            {isSearchingCustomers ? (
              <Loader2
                size={13}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#059669",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <ChevronDown
                size={13}
                onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#a1a1aa",
                  cursor: "pointer",
                }}
              />
            )}
          </div>

          {isCustomerDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "#fff",
                border: "1px solid #ebebeb",
                borderRadius: 12,
                boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {filteredCustomers.length === 0 ? (
                <div style={{ padding: "14px", textAlign: "center", ...DM, fontSize: 12, color: "#a1a1aa" }}>
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
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "9px 12px",
                      border: "none",
                      borderBottom: "1px solid #f4f4f5",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.05)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "transparent")
                    }
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ ...SYNE, fontSize: 11, fontWeight: 700, color: "#fff" }}>
                          {(c.name || "C").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            ...DM,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#0c1a0e",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.name}
                        </div>
                        <div
                          style={{
                            ...DM,
                            fontSize: 11,
                            color: "#059669",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            marginTop: 1,
                          }}
                        >
                          <Phone size={10} style={{ color: "#059669", flexShrink: 0 }} />
                          <span>{c.phone || "No contact number"}</span>
                        </div>
                      </div>
                    </div>
                    {c.id === localCustomerId && (
                      <Check size={14} style={{ color: "#059669", flexShrink: 0 }} />
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
