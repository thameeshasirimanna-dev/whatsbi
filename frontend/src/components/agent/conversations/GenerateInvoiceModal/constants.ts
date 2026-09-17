import React from "react";

export const SYNE: React.CSSProperties = { fontFamily: "inherit" };
export const DM: React.CSSProperties = { fontFamily: "inherit" };

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 14px",
  fontFamily: "inherit",
  fontSize: 13,
  color: "#16281D",
  background: "#F4F7F4",
  border: "1px solid #EAEAEA",
  borderRadius: 12,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export const onFocusGreen = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#16281D";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(159,232,112,0.3)";
};

export const onBlurGreen = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#EAEAEA";
  e.currentTarget.style.boxShadow = "none";
};
