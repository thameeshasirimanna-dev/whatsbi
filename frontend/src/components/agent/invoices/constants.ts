import React from "react";

export const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
export const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: "#3f3f46",
  background: "#f9f9f9",
  border: "1px solid #ebebeb",
  borderRadius: 9,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

export const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#22c55e";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.1)";
};

export const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#ebebeb";
  e.currentTarget.style.boxShadow = "none";
};

export const getStatusStyle = (
  status: "generated" | "sent" | "paid" | "partially_paid" | string
): React.CSSProperties => {
  if (status === "paid") {
    return {
      background: "rgba(34,197,94,0.1)",
      color: "#059669",
      border: "1px solid rgba(34,197,94,0.2)",
    };
  }
  if (status === "partially_paid") {
    return {
      background: "rgba(245,158,11,0.1)",
      color: "#d97706",
      border: "1px solid rgba(245,158,11,0.2)",
    };
  }
  if (status === "sent") {
    return {
      background: "rgba(217,119,6,0.1)",
      color: "#d97706",
      border: "1px solid rgba(217,119,6,0.2)",
    };
  }
  return {
    background: "rgba(8,145,178,0.1)",
    color: "#0891b2",
    border: "1px solid rgba(8,145,178,0.2)",
  };
};

export const capitalizeFirst = (str: string): string =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

export const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-z0-9]/gi, "_").toLowerCase();

export const getPageNumbers = (current: number, total: number): (number | string)[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, "...", total];
  if (current >= total - 2) return [1, "...", total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
};
