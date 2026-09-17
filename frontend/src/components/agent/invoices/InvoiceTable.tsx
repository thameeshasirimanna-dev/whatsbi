import React, { useRef, useEffect } from "react";
import { Eye, Download, Send, CheckCircle, CheckCircle2, Trash2, Package } from "lucide-react";
import { InvoiceWithDetails } from "./types";
import { DM, getStatusStyle, capitalizeFirst } from "./constants";

const thCell: React.CSSProperties = {
  padding: "10px 10px",
  ...DM,
  fontSize: 11,
  fontWeight: 600,
  color: "#71717a",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  textAlign: "left",
  background: "#fafafa",
  borderBottom: "1px solid #ebebeb",
  whiteSpace: "nowrap",
};

interface InvoiceTableProps {
  invoices: InvoiceWithDetails[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onView: (invoice: InvoiceWithDetails) => void;
  onDownload: (invoice: InvoiceWithDetails) => void;
  onSend: (invoice: InvoiceWithDetails) => void;
  onMarkPaid: (invoice: InvoiceWithDetails) => void;
  onMarkPaidFull: (invoice: InvoiceWithDetails) => void;
  onDelete: (invoice: InvoiceWithDetails) => void;
  updatingId: number | null;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  isAllSelected,
  isIndeterminate,
  onView,
  onDownload,
  onSend,
  onMarkPaid,
  onMarkPaidFull,
  onDelete,
  updatingId,
}) => {
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const pageIds = invoices.map((inv) => inv.id);

  return (
    <div className="hidden lg:block w-full overflow-x-auto">
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {/* Checkbox Column */}
            <th style={{ ...thCell, width: "38px", textAlign: "center", padding: "10px 6px" }}>
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                checked={isAllSelected}
                onChange={() => onSelectAll(pageIds)}
                title="Select all on current page"
                style={{
                  cursor: "pointer",
                  accentColor: "#22c55e",
                  width: 15,
                  height: 15,
                  margin: 0,
                  verticalAlign: "middle",
                }}
              />
            </th>
            <th style={{ ...thCell, width: "11%" }}>Invoice #</th>
            <th style={{ ...thCell, width: "17%" }}>Invoice Name</th>
            <th style={{ ...thCell, width: "15%" }}>Customer</th>
            <th style={{ ...thCell, width: "10%" }}>Order</th>
            <th style={{ ...thCell, width: "11%" }}>Total</th>
            <th style={{ ...thCell, width: "11%" }}>Status</th>
            <th style={{ ...thCell, width: "10%" }}>Date</th>
            <th style={{ ...thCell, textAlign: "right", width: "15%" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const isSelected = selectedIds.includes(invoice.id);
            return (
              <tr
                key={invoice.id}
                style={{
                  borderBottom: "1px solid #f4f4f5",
                  transition: "background 0.1s",
                  background: isSelected ? "#f0fdf4" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "rgba(34,197,94,0.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "transparent";
                  }
                }}
              >
                {/* Row Checkbox */}
                <td style={{ textAlign: "center", padding: "10px 6px", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(invoice.id)}
                    style={{
                      cursor: "pointer",
                      accentColor: "#22c55e",
                      width: 15,
                      height: 15,
                      margin: 0,
                      verticalAlign: "middle",
                    }}
                  />
                </td>

                {/* Invoice Number */}
                <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                  <span
                    style={{
                      ...DM,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#0891b2",
                      background: "rgba(8,145,178,0.08)",
                      padding: "2px 7px",
                      borderRadius: 5,
                      display: "inline-block",
                    }}
                  >
                    {invoice.invoice_number ||
                      `#INV-${invoice.id.toString().padStart(4, "0")}`}
                  </span>
                </td>

                {/* Invoice Name */}
                <td style={{ padding: "10px 10px", overflow: "hidden" }}>
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
                    title={invoice.name}
                  >
                    {invoice.name}
                  </div>
                </td>

                {/* Customer */}
                <td style={{ padding: "10px 10px", overflow: "hidden" }}>
                  <div
                    style={{
                      ...DM,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#0c1a0e",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={invoice.customer_name}
                  >
                    {invoice.customer_name}
                  </div>
                </td>

                {/* Order Linked */}
                <td
                  style={{
                    padding: "10px 10px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {invoice.order_id || invoice.linked_order_id ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 7px",
                        borderRadius: 5,
                        background: "rgba(5,150,105,0.08)",
                        color: "#059669",
                        ...DM,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <Package size={11} />#
                      {invoice.order_id || invoice.linked_order_id}
                    </span>
                  ) : (
                    <span style={{ ...DM, fontSize: 12, color: "#a1a1aa" }}>—</span>
                  )}
                </td>

                {/* Total */}
                <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                  <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: "#0c1a0e" }}>
                    LKR {invoice.total.toFixed(2)}
                  </span>
                </td>

                {/* Status */}
                <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                  <span
                    style={{
                      ...DM,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 20,
                      display: "inline-block",
                      ...getStatusStyle(invoice.status),
                    }}
                  >
                    {invoice.status === "partially_paid"
                      ? "Partially Paid"
                      : capitalizeFirst(invoice.status)}
                  </span>
                </td>

                {/* Date */}
                <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                  <span style={{ ...DM, fontSize: 11, color: "#71717a" }}>
                    {new Date(invoice.generated_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: "10px 10px", textAlign: "right" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 4,
                      flexWrap: "nowrap",
                    }}
                  >
                    {/* View */}
                    <button
                      onClick={() => onView(invoice)}
                      title="View PDF"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(8,145,178,0.08)",
                        color: "#0891b2",
                        flexShrink: 0,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(8,145,178,0.18)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(8,145,178,0.08)";
                      }}
                    >
                      <Eye size={12} />
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => onDownload(invoice)}
                      title="Download PDF"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(34,197,94,0.08)",
                        color: "#22c55e",
                        flexShrink: 0,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(34,197,94,0.18)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(34,197,94,0.08)";
                      }}
                    >
                      <Download size={12} />
                    </button>

                    {/* Send / Resend */}
                    {invoice.status !== "paid" && (
                      <button
                        onClick={() => onSend(invoice)}
                        disabled={updatingId === invoice.id}
                        title={
                          invoice.status === "generated"
                            ? "Send via WhatsApp"
                            : "Resend via WhatsApp"
                        }
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: "none",
                          cursor:
                            updatingId === invoice.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            updatingId === invoice.id
                              ? "#f4f4f5"
                              : "rgba(217,119,6,0.08)",
                          color:
                            updatingId === invoice.id ? "#a1a1aa" : "#d97706",
                          flexShrink: 0,
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          if (updatingId !== invoice.id)
                            e.currentTarget.style.background =
                              "rgba(217,119,6,0.18)";
                        }}
                        onMouseLeave={(e) => {
                          if (updatingId !== invoice.id)
                            e.currentTarget.style.background =
                              "rgba(217,119,6,0.08)";
                        }}
                      >
                        <Send size={12} />
                      </button>
                    )}

                    {/* Mark Paid & Create Order */}
                    {(invoice.status === "generated" || invoice.status === "sent") && (
                      <button
                        onClick={() => onMarkPaid(invoice)}
                        disabled={updatingId === invoice.id}
                        title="Mark Paid & Create Order"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: "none",
                          cursor:
                            updatingId === invoice.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            updatingId === invoice.id
                              ? "#f4f4f5"
                              : "rgba(34,197,94,0.08)",
                          color:
                            updatingId === invoice.id ? "#a1a1aa" : "#059669",
                          flexShrink: 0,
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          if (updatingId !== invoice.id)
                            e.currentTarget.style.background =
                              "rgba(34,197,94,0.18)";
                        }}
                        onMouseLeave={(e) => {
                          if (updatingId !== invoice.id)
                            e.currentTarget.style.background =
                              "rgba(34,197,94,0.08)";
                        }}
                      >
                        <CheckCircle2 size={12} />
                      </button>
                    )}

                    {/* Mark as Paid Full */}
                    {(invoice.status === "partially_paid" ||
                      (Number(invoice.advance_amount) > 0 &&
                        Number(invoice.advance_amount) <
                          Number(invoice.total || invoice.total_amount || 0) &&
                        invoice.status !== "paid")) && (
                      <button
                        onClick={() => onMarkPaidFull(invoice)}
                        disabled={updatingId === invoice.id}
                        title="Mark as Paid Full"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: "none",
                          cursor:
                            updatingId === invoice.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            updatingId === invoice.id
                              ? "#f4f4f5"
                              : "rgba(34,197,94,0.08)",
                          color:
                            updatingId === invoice.id ? "#a1a1aa" : "#059669",
                          flexShrink: 0,
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          if (updatingId !== invoice.id)
                            e.currentTarget.style.background =
                              "rgba(34,197,94,0.18)";
                        }}
                        onMouseLeave={(e) => {
                          if (updatingId !== invoice.id)
                            e.currentTarget.style.background =
                              "rgba(34,197,94,0.08)";
                        }}
                      >
                        <CheckCircle size={12} />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(invoice)}
                      disabled={updatingId === invoice.id}
                      title="Delete invoice"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        border: "none",
                        cursor:
                          updatingId === invoice.id ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          updatingId === invoice.id
                            ? "#f4f4f5"
                            : "rgba(244,63,94,0.06)",
                        color:
                          updatingId === invoice.id ? "#a1a1aa" : "#f43f5e",
                        flexShrink: 0,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (updatingId !== invoice.id)
                          e.currentTarget.style.background =
                            "rgba(244,63,94,0.14)";
                      }}
                      onMouseLeave={(e) => {
                        if (updatingId !== invoice.id)
                          e.currentTarget.style.background =
                            "rgba(244,63,94,0.06)";
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;
