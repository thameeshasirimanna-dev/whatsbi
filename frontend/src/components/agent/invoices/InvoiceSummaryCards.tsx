import React from "react";
import { FileText, DollarSign, Send, CheckCircle } from "lucide-react";
import { SYNE, DM } from "./constants";

interface InvoiceSummaryCardsProps {
  totalInvoices: number;
  totalPaidRevenue: number;
  sentCount: number;
  paidCount: number;
}

export const InvoiceSummaryCards: React.FC<InvoiceSummaryCardsProps> = ({
  totalInvoices,
  totalPaidRevenue,
  sentCount,
  paidCount,
}) => {
  const cards = [
    {
      Icon: FileText,
      label: "Total Invoices",
      value: totalInvoices,
      iconColor: "#22c55e",
      iconBg: "rgba(34,197,94,0.1)",
    },
    {
      Icon: DollarSign,
      label: "Revenue Collected",
      value: `LKR ${totalPaidRevenue.toFixed(2)}`,
      iconColor: "#059669",
      iconBg: "rgba(5,150,105,0.1)",
    },
    {
      Icon: Send,
      label: "Sent (Awaiting)",
      value: sentCount,
      iconColor: "#d97706",
      iconBg: "rgba(217,119,6,0.1)",
    },
    {
      Icon: CheckCircle,
      label: "Paid Invoices",
      value: paidCount,
      iconColor: "#0891b2",
      iconBg: "rgba(8,145,178,0.1)",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map(({ Icon, label, value, iconColor, iconBg }) => (
        <div
          key={label}
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "20px 22px",
            border: "1px solid #ebebeb",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={17} style={{ color: iconColor }} />
            </div>
          </div>
          <div
            style={{
              ...SYNE,
              fontSize: 26,
              fontWeight: 800,
              color: "#0c1a0e",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {value}
          </div>
          <div style={{ ...DM, fontSize: 13, fontWeight: 500, color: "#71717a" }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InvoiceSummaryCards;
