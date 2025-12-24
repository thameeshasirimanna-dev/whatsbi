import React from "react";
import { getToken } from "../../../lib/auth";

interface Invoice {
  id: number;
  order_id: number;
  name: string;
  pdf_url: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface InvoicesTabProps {
  invoices: Invoice[];
  agentPrefix: string | null;
  customerPhone: string | null;
  agentId: number | null;
  customerName: string;
  updatingId: number | null;
  onRefresh: () => void;
  onSendInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onMarkPaid: (invoice: Invoice) => void;
}

const InvoicesTab: React.FC<InvoicesTabProps> = ({
  invoices,
  agentPrefix,
  customerPhone,
  agentId,
  customerName,
  updatingId,
  onRefresh,
  onSendInvoice,
  onDeleteInvoice,
  onMarkPaid,
}) => {
  const handleDownload = async (invoice: Invoice) => {
    try {
      const response = await fetch(invoice.pdf_url);
      if (!response.ok) throw new Error("Failed to fetch PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.name.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      // Fallback to direct download
      const link = document.createElement("a");
      link.href = invoice.pdf_url;
      link.download = `${invoice.name.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      link.click();
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (
      !window.confirm(
        `Are you sure you want to delete invoice "${invoice.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    if (!agentPrefix) {
      alert("Missing agent prefix");
      return;
    }

    try {
      // Extract path from public URL
      const urlParts = invoice.pdf_url.split("/invoices/");
      if (urlParts.length < 2) {
        throw new Error("Invalid invoice URL");
      }
      const filePath = urlParts[1];

      const invoicesTable = `${agentPrefix}_orders_invoices`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("invoices")
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage delete error:", storageError);
        // Continue with DB delete even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from(invoicesTable)
        .delete()
        .eq("id", invoice.id);

      if (dbError) {
        throw dbError;
      }

      // Refetch data
      onRefresh();

      alert("Invoice deleted successfully!");
    } catch (err: any) {
      alert("Failed to delete invoice: " + err.message);
      console.error("Error deleting invoice:", err);
    }
  };

  return (
    <>
      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No invoices found for this customer.
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">
                  {invoice.name} - #{invoice.id.toString().padStart(4, "0")}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    invoice.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : invoice.status === "sent"
                      ? "bg-yellow-100 text-yellow-800"
                      : invoice.status === "generated"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Total: LKR {invoice.total_amount?.toFixed(2) || "0.00"}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Created on: {new Date(invoice.created_at).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.open(invoice.pdf_url, "_blank")}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => handleDownload(invoice)}
                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => onSendInvoice(invoice)}
                  className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
                >
                  Send
                </button>
                {(invoice.status === "generated" || invoice.status === "sent") && (
                  <button
                    onClick={() => onMarkPaid(invoice)}
                    disabled={updatingId === invoice.id}
                    className={`px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors ${
                      updatingId === invoice.id
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {updatingId === invoice.id ? "Updating..." : "Mark Paid"}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(invoice)}
                  className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default InvoicesTab;