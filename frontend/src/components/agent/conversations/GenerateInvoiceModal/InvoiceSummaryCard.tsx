import React from "react";

interface InvoiceSummaryCardProps {
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  total: number;
  advanceAmount: number;
  balanceDue: number;
}

export const InvoiceSummaryCard: React.FC<InvoiceSummaryCardProps> = ({
  subtotal,
  discountPercentage,
  discountAmount,
  total,
  advanceAmount,
  balanceDue,
}) => {
  return (
    <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl p-4 space-y-2 font-sans">
      <div className="flex justify-between text-xs text-[#71717A]">
        <span>Subtotal:</span>
        <span className="font-mono font-semibold text-[#16281D]">Rs. {subtotal.toFixed(2)}</span>
      </div>
      {discountPercentage > 0 && (
        <div className="flex justify-between text-xs text-[#71717A]">
          <span>Discount ({discountPercentage}%):</span>
          <span className="font-mono font-semibold text-[#E11D48]">- Rs. {discountAmount.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between items-center text-sm font-bold text-[#16281D] pt-2 border-t border-dashed border-[#EAEAEA]">
        <span>Total Amount:</span>
        <span className="font-mono text-base text-[#15803D]">Rs. {total.toFixed(2)}</span>
      </div>
      {advanceAmount > 0 && (
        <div className="pt-1 border-t border-[#EAEAEA]/60 space-y-1.5">
          <div className="flex justify-between text-xs text-[#15803D] font-medium">
            <span>Advance Due / Required:</span>
            <span className="font-mono font-bold">Rs. {Number(advanceAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-[#71717A]">
            <span>Balance Due on Delivery:</span>
            <span className="font-mono font-semibold text-[#16281D]">Rs. {balanceDue.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
