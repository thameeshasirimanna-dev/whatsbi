/**
 * Helper utilities for SMS Marketing
 * Handles GSM 7-bit vs Unicode character calculation, phone normalization, and preview interpolation.
 */

export interface SmsPartsInfo {
  length: number;
  parts: number;
  charsLeftInCurrentPart: number;
  isUnicode: boolean;
  maxPartLength: number;
}

/**
 * Normalizes phone numbers into E.164-compatible digits expected by Text.lk (e.g. 94771234567).
 */
export function normalizeSmsRecipient(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 10) {
    digits = '94' + digits.substring(1);
  } else if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    digits = '94' + digits;
  }

  return digits;
}

/**
 * Validates whether a phone number can be normalized into a valid Sri Lankan or international mobile number.
 */
export function isValidSmsPhone(phone: string): boolean {
  const normalized = normalizeSmsRecipient(phone);
  return normalized.length >= 9 && normalized.length <= 15;
}

/**
 * Calculates SMS parts, remaining characters in current part, and character encoding.
 * GSM 7-bit: 160 characters for 1 part, 153 characters per part for multi-part concatenated SMS.
 * UCS-2 Unicode: 70 characters for 1 part, 67 characters per part for multi-part concatenated SMS.
 */
export function calculateSmsParts(text: string): SmsPartsInfo {
  const length = text ? text.length : 0;
  // Unicode check: detects any character outside GSM standard basic set
  const isUnicode = /[^\u0020-\u007E\u00A0-\u00FF\n\r\t]/.test(text || '');

  if (length === 0) {
    return {
      length: 0,
      parts: 1,
      charsLeftInCurrentPart: isUnicode ? 70 : 160,
      isUnicode,
      maxPartLength: isUnicode ? 70 : 160,
    };
  }

  if (isUnicode) {
    if (length <= 70) {
      return {
        length,
        parts: 1,
        charsLeftInCurrentPart: 70 - length,
        isUnicode: true,
        maxPartLength: 70,
      };
    }
    const parts = Math.ceil(length / 67);
    const charsLeft = parts * 67 - length;
    return {
      length,
      parts,
      charsLeftInCurrentPart: charsLeft,
      isUnicode: true,
      maxPartLength: 67,
    };
  }

  // GSM 7-bit standard
  if (length <= 160) {
    return {
      length,
      parts: 1,
      charsLeftInCurrentPart: 160 - length,
      isUnicode: false,
      maxPartLength: 160,
    };
  }

  const parts = Math.ceil(length / 153);
  const charsLeft = parts * 153 - length;
  return {
    length,
    parts,
    charsLeftInCurrentPart: charsLeft,
    isUnicode: false,
    maxPartLength: 153,
  };
}

/**
 * Calculates estimated credit cost for a campaign ($0.01 per recipient per SMS part).
 */
export function calculateEstimatedCredits(recipientCount: number, text: string): number {
  const { parts } = calculateSmsParts(text);
  const totalParts = Math.max(1, parts) * Math.max(0, recipientCount);
  return Number((totalParts * 0.01).toFixed(2));
}

/**
 * Replaces placeholders like {first_name}, {name}, {phone}, {{first_name}}, etc. with sample or customer data.
 */
export function interpolateSmsPreview(
  text: string,
  sample: { first_name?: string; name?: string; phone?: string } = {
    first_name: 'Alex',
    name: 'Alex Perera',
    phone: '+94 77 123 4567',
  }
): string {
  if (!text) return '';

  const firstName =
    sample.first_name ||
    (sample.name ? sample.name.trim().split(/\s+/)[0] : 'Customer');
  const fullName = sample.name || 'Customer';
  const phone = sample.phone || '+94 77 123 4567';

  return text
    // First Name: {first_name}, {{first_name}}, {firstname}, {{firstname}}, {first name}, {{1}}, {1}
    .replace(/(?:\{\{|\{)\s*(first[_\s]?name|1)\s*(?:\}\}|\})/gi, () => firstName)
    // Full Name: {customer_name}, {name}, {{name}}, {full_name}, {{full_name}}, {fullname}, {{fullname}}, {{2}}, {2}
    .replace(/(?:\{\{|\{)\s*(customer[_\s]?name|full[_\s]?name|name|2)\s*(?:\}\}|\})/gi, () => fullName)
    // Phone: {customer_phone}, {phone}, {{phone}}, {phone_number}, {{phone_number}}, {mobile}, {{3}}, {3}
    .replace(/(?:\{\{|\{)\s*(customer[_\s]?phone|phone[_\s]?(number)?|mobile|3)\s*(?:\}\}|\})/gi, () => phone);
}

