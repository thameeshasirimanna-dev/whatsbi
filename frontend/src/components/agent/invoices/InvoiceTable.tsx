import React, { useRef, useEffect } from "react";
import { Eye, Download, Send, CheckCircle, CheckCircle2, Trash2, Package, Pencil } from "lucide-react";
import { InvoiceWithDetails } from "./types";
import { getStatusStyle, getStatusDotColor, capitalizeFirst } from "./constants";

const thCell: React.CSSProperties = {
  padding: "12px 14px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  color: "#52525B",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  textAlign: "left",
  background: "#F8FAF8",
  borderBottom: "1px solid #EAEAEA",
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
  onEdit?: (invoice: InvoiceWithDetails) => void;
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
  onEdit,
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
    <div className="hidden lg:block w-full overflow-x-auto font-sans select-none">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr>
            <th style={{ ...thCell, width: "38px", textAlign: "center", padding: "10px 6px" }}>
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                checked={isAllSelected}
                onChange={() => onSelectAll(pageIds)}
                title="Select all on current page"
                className="cursor-pointer w-4 h-4 rounded accent-[#9FE870] m-0 align-middle"
              />
            </th>
            <th style={{ ...thCell, width: "11%" }}>Invoice #</th>
            <th style={{ ...thCell, width: "17%" }}>Invoice Name</th>
            <th style={{ ...thCell, width: "15%" }}>Customer</th>
            <th style={{ ...thCell, width: "10%" }}>Order</th>
            <th style={{ ...thCell, width: "11%" }}>Total</th>
            <th style={{ ...thCell, width: "12%" }}>Status</th>
            <th style={{ ...thCell, width: "10%" }}>Date</th>
            <th style={{ ...thCell, textAlign: "right", width: "14%" }}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F4F4F5]">
          {invoices.map((invoice) => {
            const isSelected = selectedIds.includes(invoice.id);
            const isUpdating = updatingId === invoice.id;

            return (
              <tr
                key={invoice.id}
                className={`transition-colors duration-150 ${
                  isSelected ? "bg-[#F0FDF4]" : "hover:bg-[#FAFFFE] bg-transparent"
                }`}
              >
                {/* Row Checkbox */}
                <td className="text-center p-2.5 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(invoice.id)}
                    className="cursor-pointer w-4 h-4 rounded accent-[#9FE870] m-0 align-middle"
                  />
                </td>

                {/* Invoice Number */}
                <td className="p-2.5 whitespace-nowrap">
                  <span className="font-mono text-[11px] font-bold text-[#16281D] bg-[#F4F7F4] border border-[#E4E4E7] px-2 py-0.5 rounded-md">
                    {invoice.invoice_number || `#INV-${invoice.id.toString().padStart(4, "0")}`}
                  </span>
                </td>

                {/* Invoice Name */}
                <td className="p-2.5 overflow-hidden">
                  <div
                    className="text-xs font-bold text-[#16281D] truncate"
                    title={invoice.name}
                  >
                    {invoice.name}
                  </div>
                </td>

                {/* Customer */}
                <td className="p-2.5 overflow-hidden">
                  <div
                    className="text-xs font-semibold text-[#52525B] truncate"
                    title={invoice.customer_name}
                  >
                    {invoice.customer_name}
                  </div>
                </td>

                {/* Order Linked */}
                <td className="p-2.5 whitespace-nowrap overflow-hidden">
                  {invoice.order_id || invoice.linked_order_id ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[11px] font-bold font-mono">
                      <Package size={11} strokeWidth={2.4} />#{invoice.order_id || invoice.linked_order_id}
                    </span>
                  ) : (
                    <span className="text-xs text-[#A1A1AA] font-mono">—</span>
                  )}
                </td>

                {/* Total */}
                <td className="p-2.5 whitespace-nowrap">
                  <span className="font-mono text-xs font-extrabold text-[#16281D]">
                    Rs. {invoice.total.toFixed(2)}
                  </span>
                </td>

                {/* Status Badge with Dot Token */}
                <td className="p-2.5 whitespace-nowrap">
                  <span style={getStatusStyle(invoice.status)}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: getStatusDotColor(invoice.status),
                      }}
                    />
                    <span>
                      {invoice.status === "partially_paid"
                        ? "Partially Paid"
                        : capitalizeFirst(invoice.status || "generated")}
                    </span>
                  </span>
                </td>

                {/* Date */}
                <td className="p-2.5 whitespace-nowrap">
                  <span className="text-[11px] font-medium text-[#71717A]">
                    {new Date(invoice.generated_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </td>

                {/* Actions */}
                <td className="p-2.5 text-right">
                  <div className="flex items-center justify-end gap-1 flex-nowrap">
                    {/* View PDF */}
                    <button
                      type="button"
                      onClick={() => onView(invoice)}
                      title="View PDF"
                      className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D] flex items-center justify-center border-0 cursor-pointer transition-all"
                    >
                      <Eye size={12} strokeWidth={2.4} />
                    </button>

                    {/* Edit */}
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(invoice)}
                        title="Edit Invoice"
                        className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D] flex items-center justify-center border-0 cursor-pointer transition-all"
                      >
                        <Pencil size={12} strokeWidth={2.4} />
                      </button>
                    )}

                    {/* Download */}
                    <button
                      type="button"
                      onClick={() => onDownload(invoice)}
                      title="Download PDF"
                      className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D] flex items-center justify-center border-0 cursor-pointer transition-all"
                    >
                      <Download size={12} strokeWidth={2.4} />
                    </button>

                    {/* Send / Resend */}
                    {invoice.status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => onSend(invoice)}
                        disabled={isUpdating}
                        title={invoice.status === "generated" ? "Send via WhatsApp" : "Resend via WhatsApp"}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-0 transition-all ${
                          isUpdating
                            ? "bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed"
                            : "bg-[#ECFDF5] hover:bg-[#A7F3D0] text-[#059669] cursor-pointer"
                        }`}
                      >
                        <Send size={12} strokeWidth={2.4} />
                      </button>
                    )}

                    {/* Mark Paid & Create Order */}
                    {(invoice.status === "generated" || invoice.status === "sent") && (
                      <button
                        type="button"
                        onClick={() => onMarkPaid(invoice)}
                        disabled={isUpdating}
                        title="Mark Paid & Create Order"
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-0 transition-all ${
                          isUpdating
                            ? "bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed"
                            : "bg-[#F0FDF4] hover:bg-[#BBF7D0] text-[#15803D] cursor-pointer"
                        }`}
                      >
                        <CheckCircle2 size={12} strokeWidth={2.4} />
                      </button>
                    )}

                    {/* Mark Paid Full */}
                    {(invoice.status === "partially_paid" ||
                      (Number(invoice.advance_amount) > 0 &&
                        Number(invoice.advance_amount) <
                          Number(invoice.total || invoice.total_amount || 0) &&
                        invoice.status !== "paid")) && (
                      <button
                        type="button"
                        onClick={() => onMarkPaidFull(invoice)}
                        disabled={isUpdating}
                        title="Mark as Paid Full"
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-0 transition-all ${
                          isUpdating
                            ? "bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed"
                            : "bg-[#F0FDF4] hover:bg-[#BBF7D0] text-[#15803D] cursor-pointer"
                        }`}
                      >
                        <CheckCircle size={12} strokeWidth={2.4} />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onDelete(invoice)}
                      disabled={isUpdating}
                      title="Delete invoice"
                      className={`w-7 h-7 rounded-full flex items-center justify-center border-0 transition-all ${
                        isUpdating
                          ? "bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed"
                          : "bg-[#FFF1F2] hover:bg-[#FECDD3] text-[#E11D48] cursor-pointer"
                      }`}
                    >
                      <Trash2 size={12} strokeWidth={2.4} />
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
