/**
 * Helper utilities for Broadcast Campaigns (WhatsApp & SMS)
 * Provides SMS character/parts telemetry, recipient phone validation, and live preview interpolation.
 */

export interface SmsPartsInfo {
  length: number;
  parts: number;
  charsLeftInCurrentPart: number;
  isUnicode: boolean;
  maxPartLength: number;
}

/**
 * Normalizes phone numbers to standard international digits without symbols (e.g. 94771234567).
 */
export function normalizePhoneDigits(phone: string): string {
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
 * Validates whether a phone number is a deliverable mobile number.
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneDigits(phone);
  return normalized.length >= 9 && normalized.length <= 15;
}

/**
 * Calculates SMS parts, character length, remaining characters, and character encoding.
 * GSM 7-bit standard: 160 characters (single) / 153 characters per part (concatenated).
 * UCS-2 Unicode: 70 characters (single) / 67 characters per part (concatenated).
 */
export function calculateSmsParts(text: string): SmsPartsInfo {
  const length = text ? text.length : 0;
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
 * Replaces placeholders ({first_name}, {name}, {phone}, {{first_name}}, {{1}}, etc.)
 * with sample customer data for live preview.
 */
export function interpolateBroadcastPreview(
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

/**
 * Loads WhatsApp configuration and approved Meta templates for the agent.
 */
export async function fetchWhatsAppConfigAndTemplates(token: string): Promise<{
  config: any | null;
  templates: any[];
}> {
  try {
    const userResp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userResp.json();

    if (userData.success && userData.user) {
      const configResp = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${userData.user.id}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (configResp.ok) {
        const configData = await configResp.json();
        if (configData.success && configData.whatsapp_config) {
          const whatsappConfig = configData.whatsapp_config[0] || configData.whatsapp_config;
          let templates: any[] = [];
          try {
            const metaResp = await fetch(
              `https://graph.facebook.com/v20.0/${whatsappConfig.business_account_id}/message_templates`,
              {
                method: 'GET',
                headers: { Authorization: `Bearer ${whatsappConfig.api_key}` },
              }
            );
            if (metaResp.ok) {
              const metaData = await metaResp.json();
              templates = metaData.data?.filter((t: any) => t.status === 'APPROVED') || [];
            }
          } catch (metaErr) {
            console.error('Failed to load Meta templates:', metaErr);
          }
          return { config: whatsappConfig, templates };
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch WhatsApp config/templates:', err);
  }
  return { config: null, templates: [] };
}

/**
 * Checks whether a customer sent an inbound message within the last 24 hours.
 * Meta WhatsApp Business API requires a session to be open within 24h for free-form text messages.
 */
export function isCustomerWithin24Hours(lastUserMessageTime?: string | null): boolean {
  if (!lastUserMessageTime) return false;
  const parsedTime = new Date(lastUserMessageTime).getTime();
  if (isNaN(parsedTime)) return false;
  const now = Date.now();
  const hoursSince = (now - parsedTime) / (1000 * 60 * 60);
  return hoursSince >= 0 && hoursSince <= 24;
}

/**
 * Formats elapsed duration since the customer's last message for UI badges and tooltips.
 */
export function formatHoursSinceLastMessage(lastUserMessageTime?: string | null): string {
  if (!lastUserMessageTime) return 'Never messaged';
  const parsedTime = new Date(lastUserMessageTime).getTime();
  if (isNaN(parsedTime)) return 'Never messaged';
  const now = Date.now();
  const hoursSince = (now - parsedTime) / (1000 * 60 * 60);
  if (hoursSince < 0) return 'Just now';
  if (hoursSince < 1) {
    const mins = Math.max(1, Math.round(hoursSince * 60));
    return `${mins}m ago`;
  }
  if (hoursSince < 24) {
    return `${Math.floor(hoursSince)}h ago`;
  }
  const days = Math.floor(hoursSince / 24);
  return `${days}d ago`;
}

/**
 * Uploads a broadcast media file (poster/image) to the server.
 */
export async function uploadBroadcastMedia(
  file: File,
  token: string
): Promise<{
  id?: string;
  link: string;
  filename: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caption', '');

  const uploadResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-media`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const uploadResult = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadResult?.success) {
    throw new Error(uploadResult?.error || 'Failed to upload poster image');
  }

  const mediaItem = uploadResult.media?.[0];
  if (!mediaItem) {
    throw new Error('No media received from upload server');
  }

  return {
    id: mediaItem.media_id,
    link: mediaItem.media_download_url,
    filename: file.name,
  };
}

/**
 * Filters broadcast recipients by targeting settings and the 24h WhatsApp policy.
 */
export function filterBroadcastCustomers(
  customers: any[],
  opts: {
    channel: 'whatsapp' | 'sms';
    messageType: 'text' | 'template';
    targetAudienceType: 'all' | 'filtered' | 'group' | 'manual';
    selectedGroupId: string;
    selectedCustomerIds: number[];
    customerGroups: any[];
    filterLeadStage: string;
    filterInterestStage: string;
    filterConversionStage: string;
    filterLanguage: string;
  }
): any[] {
  // Free-form messages can ONLY send for 24h active group
  if (opts.channel === 'whatsapp' && opts.messageType === 'text') {
    return customers.filter((c: any) => isCustomerWithin24Hours(c.last_user_message_time));
  }

  if (opts.targetAudienceType === 'all') {
    return customers;
  }

  if (opts.targetAudienceType === 'group') {
    const gid = Number(opts.selectedGroupId);
    const selectedGroup = opts.customerGroups.find((g) => g.id === gid);
    if (selectedGroup && selectedGroup.name.toLowerCase() === 'within 24h active') {
      return customers.filter((c: any) => isCustomerWithin24Hours(c.last_user_message_time));
    }
    return customers.filter((c: any) => {
      if (Array.isArray(c.group_ids)) return c.group_ids.includes(gid);
      if (Array.isArray(c.groups)) return c.groups.some((g: any) => g.id === gid || g === gid);
      return false;
    });
  }

  if (opts.targetAudienceType === 'manual') {
    return customers.filter((c: any) => opts.selectedCustomerIds.includes(c.id));
  }

  return customers.filter((c: any) => {
    const leadMatch = opts.filterLeadStage === 'all' || c.lead_stage === opts.filterLeadStage;
    const interestMatch = opts.filterInterestStage === 'all' || c.interest_stage === opts.filterInterestStage;
    const conversionMatch =
      opts.filterConversionStage === 'all' || c.conversion_stage === opts.filterConversionStage;
    const langMatch = opts.filterLanguage === 'all' || c.language === opts.filterLanguage;
    return leadMatch && interestMatch && conversionMatch && langMatch;
  });
}


