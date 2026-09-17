import React from "react";
import { SYNE, DM } from "./constants";

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
    <div
      style={{
        background: "#f9f9fb",
        border: "1px solid #ededf2",
        borderRadius: 14,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", ...DM, fontSize: 12, color: "#71717a" }}>
        <span>Subtotal:</span>
        <span style={{ fontWeight: 600, color: "#3f3f46" }}>LKR {subtotal.toFixed(2)}</span>
      </div>
      {discountPercentage > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", ...DM, fontSize: 12, color: "#71717a" }}>
          <span>Discount ({discountPercentage}%):</span>
          <span style={{ fontWeight: 600, color: "#f43f5e" }}>- LKR {discountAmount.toFixed(2)}</span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          ...SYNE,
          fontSize: 14,
          fontWeight: 700,
          color: "#0c1a0e",
          paddingTop: 4,
          borderTop: "1px dashed #e4e4e7",
        }}
      >
        <span>Total Amount:</span>
        <span style={{ color: "#059669" }}>LKR {total.toFixed(2)}</span>
      </div>
      {advanceAmount > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", ...DM, fontSize: 12, color: "#059669" }}>
            <span>Advance Due / Required:</span>
            <span style={{ fontWeight: 600 }}>LKR {Number(advanceAmount).toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", ...DM, fontSize: 12, color: "#71717a" }}>
            <span>Balance Due on Delivery:</span>
            <span style={{ fontWeight: 600 }}>LKR {balanceDue.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );
};
