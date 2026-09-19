/**
 * Text.lk SMS Gateway Service (Sri Lanka)
 * Provides phone number normalization, SMS segment calculation, and delivery via Text.lk v3 REST API.
 */

export interface TextLkSmsParams {
  recipient: string;
  message: string;
  senderId: string;
  apiToken: string;
}

export interface TextLkSmsResponse {
  success: boolean;
  messageId?: string;
  raw?: any;
  error?: string;
}

/**
 * Normalizes phone numbers to standard format expected by Text.lk (e.g. 94771234567, no '+', digits only).
 */
export function normalizeSmsRecipient(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");

  // Sri Lanka local format (07XXXXXXXX) -> 947XXXXXXXX
  if (digits.startsWith("0") && digits.length === 10) {
    digits = "94" + digits.substring(1);
  } else if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    digits = "94" + digits;
  }

  return digits;
}

/**
 * Calculates SMS segment count and characters remaining based on GSM 7-bit vs UCS-2 Unicode.
 */
export function calculateSmsParts(text: string): {
  length: number;
  parts: number;
  charsLeftInCurrentPart: number;
  isUnicode: boolean;
} {
  const length = text ? text.length : 0;
  // Check for characters outside standard GSM 7-bit basic character set
  const isUnicode = /[^\u0020-\u007E\u00A0-\u00FF\n\r\t]/.test(text);

  if (length === 0) {
    return { length: 0, parts: 1, charsLeftInCurrentPart: isUnicode ? 70 : 160, isUnicode };
  }

  if (isUnicode) {
    if (length <= 70) {
      return { length, parts: 1, charsLeftInCurrentPart: 70 - length, isUnicode };
    }
    const parts = Math.ceil(length / 67);
    const charsLeft = parts * 67 - length;
    return { length, parts, charsLeftInCurrentPart: charsLeft, isUnicode };
  }

  if (length <= 160) {
    return { length, parts: 1, charsLeftInCurrentPart: 160 - length, isUnicode };
  }
  const parts = Math.ceil(length / 153);
  const charsLeft = parts * 153 - length;
  return { length, parts, charsLeftInCurrentPart: charsLeft, isUnicode };
}

/**
 * Replaces dynamic placeholders ({first_name}, {name}, {phone}, {{first_name}}, etc.)
 * with the recipient customer's actual personal data.
 */
export function interpolateSmsTemplate(
  template: string,
  customer: { name?: string | null; phone?: string | null }
): string {
  if (!template) return "";

  const rawName = (customer.name || "").trim();
  const rawPhone = (customer.phone || "").trim();

  // Extract first name: first whitespace segment if name is provided, otherwise fallback to Customer
  const firstName = rawName ? rawName.split(/\s+/)[0] : "Customer";
  const fullName = rawName || "Customer";
  const phone = rawPhone || "";

  return template
    // First Name: {first_name}, {{first_name}}, {firstname}, {{firstname}}, {first name}, {{1}}, {1}
    .replace(/(?:\{\{|\{)\s*(first[_\s]?name|1)\s*(?:\}\}|\})/gi, () => firstName)
    // Full Name: {customer_name}, {name}, {{name}}, {full_name}, {{full_name}}, {fullname}, {{fullname}}, {{2}}, {2}
    .replace(/(?:\{\{|\{)\s*(customer[_\s]?name|full[_\s]?name|name|2)\s*(?:\}\}|\})/gi, () => fullName)
    // Phone: {customer_phone}, {phone}, {{phone}}, {phone_number}, {{phone_number}}, {mobile}, {{3}}, {3}
    .replace(/(?:\{\{|\{)\s*(customer[_\s]?phone|phone[_\s]?(number)?|mobile|3)\s*(?:\}\}|\})/gi, () => phone);
}

/**
 * Dispatches a single plain SMS message via Text.lk v3 REST API.
 */
export async function sendTextLkSms(params: TextLkSmsParams): Promise<TextLkSmsResponse> {
  const { recipient, message, senderId, apiToken } = params;

  if (!apiToken || !apiToken.trim()) {
    return {
      success: false,
      error: "Text.lk API token is missing or not configured.",
    };
  }

  if (!senderId || !senderId.trim()) {
    return {
      success: false,
      error: "SMS Sender ID is missing. Configure Sender ID in Super Admin Dashboard.",
    };
  }

  const normalizedPhone = normalizeSmsRecipient(recipient);
  if (!normalizedPhone || normalizedPhone.length < 9) {
    return {
      success: false,
      error: `Invalid recipient phone number: ${recipient}`,
    };
  }

  if (!message || !message.trim()) {
    return {
      success: false,
      error: "SMS message content cannot be empty.",
    };
  }

  try {
    const response = await fetch("https://app.text.lk/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        recipient: normalizedPhone,
        sender_id: senderId.trim(),
        type: "plain",
        message: message.trim(),
      }),
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawText: responseText };
    }

    if (!response.ok) {
      const errMsg = data.message || `Text.lk API HTTP ${response.status}: ${responseText}`;
      return {
        success: false,
        error: errMsg,
        raw: data,
      };
    }

    if (data.status === "error") {
      return {
        success: false,
        error: data.message || "Text.lk reported an error sending SMS.",
        raw: data,
      };
    }

    const messageId =
      data.data?.uid ||
      data.data?.id ||
      data.data?.message_id ||
      (typeof data.data === "string" ? data.data : undefined);

    return {
      success: true,
      messageId: messageId ? String(messageId) : undefined,
      raw: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error communicating with Text.lk SMS gateway",
    };
  }
}

/**
 * Resolves the Text.lk SMS credentials for an agent (Sender ID & API Token).
 */
export async function getAgentSmsConfig(
  pgClient: any,
  userId: string
): Promise<{ senderId: string | null; apiToken: string | null }> {
  const query = `
    SELECT sms_sender_id, sms_api_token
    FROM whatsapp_configuration
    WHERE user_id = $1 AND is_active = true
    LIMIT 1
  `;
  const { rows } = await pgClient.query(query, [userId]);
  const config = rows[0] || {};

  const senderId =
    (config.sms_sender_id && config.sms_sender_id.trim()) ||
    process.env.TEXTLK_SENDER_ID ||
    process.env.SMS_SENDER_ID ||
    null;

  const apiToken =
    (config.sms_api_token && config.sms_api_token.trim()) ||
    process.env.TEXTLK_API_TOKEN ||
    process.env.SMS_API_TOKEN ||
    null;

  return { senderId, apiToken };
}

