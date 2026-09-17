import React from "react";

export const SYNE: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
export const DM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  color: "#16281D",
  background: "#FAFAFA",
  border: "1px solid #E4E4E7",
  borderRadius: 12,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  borderRadius: 9999,
  padding: "8px 16px",
  appearance: "none",
  cursor: "pointer",
};

export const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#9FE870";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(159,232,112,0.25)";
  e.currentTarget.style.background = "#fff";
};

export const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#E4E4E7";
  e.currentTarget.style.boxShadow = "none";
  e.currentTarget.style.background = "#FAFAFA";
};

export const getStatusStyle = (
  status: "generated" | "sent" | "paid" | "partially_paid" | string
): React.CSSProperties => {
  const s = (status || "").toLowerCase();
  if (s === "paid") {
    return {
      background: "#F0FDF4",
      color: "#15803D",
      border: "1px solid #BBF7D0",
      borderRadius: 9999,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 700,
    };
  }
  if (s === "partially_paid" || s === "sent") {
    return {
      background: "#FFFBEB",
      color: "#92400E",
      border: "1px solid #FDE68A",
      borderRadius: 9999,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 700,
    };
  }
  return {
    background: "#F4F4F5",
    color: "#52525B",
    border: "1px solid #E4E4E7",
    borderRadius: 9999,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
  };
};

export const getStatusDotColor = (
  status: "generated" | "sent" | "paid" | "partially_paid" | string
): string => {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "#22C55E";
  if (s === "partially_paid" || s === "sent") return "#F59E0B";
  return "#71717A";
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
