/**
 * Standard Sri Lankan Rupee (Rs.) currency formatters
 */

export const formatRs = (
  amount: number | string | undefined | null,
  decimals = 2
): string => {
  const num =
    typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return decimals > 0 ? `Rs. 0.${'0'.repeat(decimals)}` : "Rs. 0";
  return `Rs. ${num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const formatRsCompact = (
  amount: number | string | undefined | null
): string => {
  const num =
    typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return "Rs. 0";
  if (num >= 1000000) {
    return `Rs. ${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `Rs. ${(num / 1000).toFixed(0)}k`;
  }
  return `Rs. ${num.toLocaleString()}`;
};
