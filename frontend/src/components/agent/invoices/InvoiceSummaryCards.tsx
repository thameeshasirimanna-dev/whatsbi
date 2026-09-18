import React from "react";
import { FileText, DollarSign, Send, CheckCircle } from "lucide-react";

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
      iconColor: "text-[#15803D]",
      iconBg: "bg-[#F0FDF4] border border-[#BBF7D0]",
    },
    {
      Icon: DollarSign,
      label: "Revenue Collected",
      value: `Rs. ${totalPaidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      iconColor: "text-[#059669]",
      iconBg: "bg-[#ECFDF5] border border-[#A7F3D0]",
    },
    {
      Icon: Send,
      label: "Sent (Awaiting)",
      value: sentCount,
      iconColor: "text-[#D97706]",
      iconBg: "bg-[#FFFBEB] border border-[#FDE68A]",
    },
    {
      Icon: CheckCircle,
      label: "Paid Invoices",
      value: paidCount,
      iconColor: "text-[#0284C7]",
      iconBg: "bg-[#F0F9FF] border border-[#BAE6FD]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 font-sans select-none">
      {cards.map(({ Icon, label, value, iconColor, iconBg }) => (
        <div
          key={label}
          className="bg-white rounded-[16px] sm:rounded-[20px] p-3 sm:p-5 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_rgba(20,40,24,0.06)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between min-w-0"
        >
          <div className="flex items-start justify-between mb-2 sm:mb-3.5">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
            >
              <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.4} />
            </div>
          </div>
          <div className="font-mono text-base sm:text-2xl font-extrabold text-[#16281D] tracking-tight leading-none mb-1 sm:mb-1.5 truncate" title={String(value)}>
            {value}
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-[#71717A] leading-tight truncate">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InvoiceSummaryCards;
