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

export const onFocusGreen = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#22c55e";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.1)";
};

export const onBlurGreen = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#ebebeb";
  e.currentTarget.style.boxShadow = "none";
};
