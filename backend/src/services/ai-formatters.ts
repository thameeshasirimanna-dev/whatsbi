/**
 * Text and formatting helpers for AI Chatbot and WhatsApp messaging
 */

/**
 * Strips emoji characters to enforce standard clean text compliance
 */
export function stripEmojis(text: string): string {
  if (!text) return '';
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Checks whether a message contains bank transfer or account details
 */
export function isBankDetailsMessage(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const bankPatterns = [
    /\b(?:bank(?:\s*name)?|බැංකුව)\b/i,
    /\b(?:account\s*(?:no|number|name|holder)|acc(?:ount)?\s*(?:no|number|name|#)|a\/c\s*(?:no|number|#)?|ගිණුම්\s*අංකය|ගිණුමේ\s*නම)\b/i,
    /\b(?:branch(?:\s*name)?|ශාඛාව)\b/i,
    /\b(?:swift(?:\s*code)?|iban)\b/i,
  ];
  let matches = 0;
  for (const p of bankPatterns) {
    if (p.test(text)) matches++;
  }
  const hasAccDigits = /(?:acc(?:ount)?|a\/c|ගිණුම්|account\s*no)[^\n\d]{0,25}\d{6,16}/i.test(text);
  return matches >= 2 || (matches >= 1 && hasAccDigits);
}

/**
 * Formats message spacing and WhatsApp markdown using safe, non-destructive hygiene:
 * 1. Normalizes newlines and removes zero-width characters.
 * 2. Ensures proper spacing after sentence punctuation and around bold markers.
 * 3. Formats bullet dots (•) at line starts without chopping running prose.
 * 4. Standardizes currency formatting (e.g. Rs. 15,000).
 * 5. Standardizes start-of-line bold field labels (Bank, Invoice, Customer, etc.).
 * 6. Collapses excessive newlines (max 2 consecutive newlines = 1 blank line).
 *
 * NOTE: Destructive regex splits that chop sentences in half have been eliminated.
 * The AI system prompt handles semantic paragraphing and line breaks naturally.
 */
export function formatMessageSpacingAndLineBreaks(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // 1. Basic newline and invisible space normalization (strictly preserving \u200D ZWJ for Sinhala Yansaya/Rakaransaya)
  let s = fixSinhalaOrthography(text)
    .replace(/\r\n/g, '\n')
    .replace(/[\u200B\u200E\u200F\uFEFF]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // 2. Safe start-of-line bold field label normalization (only at line start, never mid-sentence!)
  const labelPatterns: Array<[RegExp, string]> = [
    [/^[ \t]*\*?Invoice\*?:[ \t]*/gm, '*Invoice:* '],
    [/^[ \t]*\*?Customer\*?:[ \t]*/gm, '*Customer:* '],
    [/^[ \t]*\*?Item\*?:[ \t]*/gm, '*Item:* '],
    [/^[ \t]*\*?Unit Price\*?:[ \t]*/gm, '*Unit Price:* '],
    [/^[ \t]*\*?Total Amount\*?:[ \t]*/gm, '*Total Amount:* '],
    [/^[ \t]*\*?Bank Details\*?:?[ \t]*/gm, '*Bank Details:*'],
    [/^[ \t]*\*?Bank\*?:[ \t]*/gm, '*Bank:* '],
    [/^[ \t]*\*?Account Name\*?:[ \t]*/gm, '*Account Name:* '],
    [/^[ \t]*\*?Account Number\*?:[ \t]*/gm, '*Account Number:* '],
    [/^[ \t]*\*?Branch\*?:[ \t]*/gm, '*Branch:* '],
  ];
  for (const [re, rep] of labelPatterns) s = s.replace(re, rep);

  // Normalize # on invoice number at line start
  s = s.replace(/^(\*Invoice:\*\s*)(?!#)(INV-\d+)/gm, '$1#$2');

  // 3. Ensure clean blank lines before *Invoice:* and *Bank Details:*, and after *Branch:* (line boundaries only)
  s = s.replace(/([^\n])\n(\*Invoice:\*)/g, '$1\n\n$2');
  s = s.replace(/([^\n])\n(\*Bank Details:\*)/g, '$1\n\n$2');
  s = s.replace(/(\*Branch:\*[^\n]+)\n([^\n]+)/g, '$1\n\n$2');

  // 4. Collapse 3+ newlines to 2 (max 1 blank line)
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Backwards-compatible wrapper that formats bank and invoice details
 */
export function formatBankDetails(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return formatMessageSpacingAndLineBreaks(text);
}

/**
 * Sanitizes text for WhatsApp markdown compliance.
 * Converts markdown **bold** to WhatsApp *bold*, changes asterisk bullets to unicode •,
 * fixes spaces inside asterisks that prevent bolding, strips unmatched asterisks,
 * eliminates any triple or rogue asterisks (***), and standardizes line breaks and Sinhala phrasing.
 */
export function sanitizeWhatsAppFormatting(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let s = fixSinhalaOrthography(text);

  // 1. Convert markdown bold-italic (***bold***) or double bold (**bold**) to single asterisk *bold*
  s = s.replace(/\*{2,3}([^*\n]+?)\*{2,3}/g, '*$1*');

  // 2. Strip markdown divider lines made of asterisks (e.g. *** or * * *)
  s = s.replace(/^[ \t]*\*{3,}[ \t]*$/gm, '');
  s = s.replace(/^[ \t]*\*(?:[ \t]*\*){2,}[ \t]*$/gm, '');

  // 3. Remove any 3 or more consecutive asterisks anywhere: *** -> *
  s = s.replace(/\*{3,}/g, '*');

  // 4. Convert markdown bullet asterisks (* Item) at start of lines to unicode bullet dots (• Item)
  s = s.replace(/^([ \t]*)\*[ \t]+(?!\*)/gm, '$1• ');

  // 5. Fix inner spaces that break WhatsApp bold formatting (* word * -> *word*)
  s = s.replace(/\*([ \t]+)([^*\n]+?)\*/g, '*$2*');
  s = s.replace(/\*([^*\n]+?)([ \t]+)\*/g, '*$1*');

  // 6. Remove empty double asterisks
  s = s.replace(/\*{2,}/g, '');

  // 7. Apply natural Sinhala phrasing & spacing/line breaks
  s = naturalizeSinhalaPhrasing(s);
  s = formatMessageSpacingAndLineBreaks(s);

  // 8. Clean up any stray asterisks immediately following bold field labels (e.g. "*Bank:* *" -> "*Bank:* ")
  s = s.replace(/(\*[a-zA-Z0-9\u0D80-\u0DFF\s]+:\*)[ \t]*\*/g, '$1');

  // 9. Remove any stray standalone asterisks: " * " -> " "
  s = s.replace(/[ \t]+\*[ \t]+/g, ' ');

  // 10. Clean up any lone or unmatched asterisks on a line
  const lines = s.split('\n');
  s = lines.map((line) => {
    const asterisks = line.match(/\*/g);
    if (asterisks && asterisks.length % 2 !== 0) {
      if (/^[ \t]*\*[ \t]+/.test(line)) return line.replace(/^[ \t]*\*[ \t]+/, '• ');
      if (/[ \t]+\*[ \t]*$/.test(line)) return line.replace(/[ \t]+\*[ \t]*$/, '');
      if (/[ \t]\*[ \t]/.test(line)) return line.replace(/[ \t]\*[ \t]/g, ' ');
      const idx = line.lastIndexOf('*');
      return line.slice(0, idx) + line.slice(idx + 1);
    }
    return line;
  }).join('\n');

  // 11. Final safety pass: strictly remove any remaining multiple consecutive asterisks (** or ***)
  s = s.replace(/\*{2,}/g, '');

  return fixSinhalaOrthography(s.trim());
}

/**
 * Corrects Sinhala orthography, ligatures, and common AI spelling errors.
 * Specifically converts "අවශ්ය" to "අවශ්‍ය" (with Yansaya), and repairs missing
 * Zero-Width Joiners (ZWJ U+200D) across Sinhala Yansaya and Rakaransaya characters.
 */
export function fixSinhalaOrthography(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let s = text;
  // 1. Explicitly repair "අවශ්ය" -> "අවශ්‍ය"
  s = s.replace(/අවශ්ය/g, 'අවශ්‍ය');
  // 2. Repair Sha + Yansaya where ZWJ is missing (ශ් + ය -> ශ්‍ය, e.g. අවශ්‍ය, විශේෂ්‍ය, දෘශ්‍ය)
  s = s.replace(/\u0DC1\u0DCA(?!\u200D)\u0DBA/g, 'ශ්‍ය');
  // 3. Repair general Sinhala Yansaya (consonant + al-lakuna + ya -> consonant + yansaya)
  s = s.replace(/([\u0D9A-\u0DC6])\u0DCA(?!\u200D)\u0DBA/g, (_, c) => c + '\u0DCA\u200D\u0DBA');
  // 4. Repair general Sinhala Rakaransaya (consonant + al-lakuna + ra -> consonant + rakaransaya)
  s = s.replace(/([\u0D9A-\u0DC6])\u0DCA(?!\u200D)\u0DBB/g, (_, c) => c + '\u0DCA\u200D\u0DBB');
  return s;
}

/**
 * Naturalizes Sinhala phrasing by converting awkward direct machine translations
 * (e.g. "5 දවස් වලට" -> "දවස් 5කට", "5 දවස් වලින්" -> "දවස් 5කින්", "එවන්නෙමු" -> "එවනවා")
 * into authentic spoken conversational Sinhala.
 */
export function naturalizeSinhalaPhrasing(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let s = fixSinhalaOrthography(text);

  // 1. Time durations & units (e.g. "5 දවස් වලට" -> "දවස් 5කට", "5 දවස් වලින්" -> "දවස් 5කින්")
  const timeUnits = [{ label: 'දවස්', alt: 'දින' }, { label: 'සති' }, { label: 'මාස' }, { label: 'පැය' }];
  for (const u of timeUnits) {
    const pattern = u.alt ? `(?:${u.label}|${u.alt})` : u.label;
    s = s.replace(new RegExp(`(^|[\\s.,!?*()\\[\\]~_])(\\d+)\\s*${pattern}\\s*වලට(?=[\\s.,!?*()\\[\\]~_]|$)`, 'g'), `$1${u.label} $2කට`);
    s = s.replace(new RegExp(`(^|[\\s.,!?*()\\[\\]~_])${pattern}\\s*(\\d+)\\s*වලට(?=[\\s.,!?*()\\[\\]~_]|$)`, 'g'), `$1${u.label} $2කට`);
    s = s.replace(new RegExp(`(^|[\\s.,!?*()\\[\\]~_])(\\d+)\\s*${pattern}\\s*වලින්(?=[\\s.,!?*()\\[\\]~_]|$)`, 'g'), `$1${u.label} $2කින්`);
    s = s.replace(new RegExp(`(^|[\\s.,!?*()\\[\\]~_])${pattern}\\s*(\\d+)\\s*වලින්(?=[\\s.,!?*()\\[\\]~_]|$)`, 'g'), `$1${u.label} $2කින්`);
  }
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*(?:දවස්|දින)\s*ඇතුළත(?=[\s.,!?*()\[\]~_]|$)/g, '$1දවස් $2ක් ඇතුළත');

  // 2. Replace literary/chatbot endings with natural spoken forms
  const spokenReplacements: Array<[RegExp, string]> = [
    [/(^|[\s.,!?*()\[\]~_])එවන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1එවනවා'],
    [/(^|[\s.,!?*()\[\]~_])කරන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1කරනවා'],
    [/(^|[\s.,!?*()\[\]~_])දන්වන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1දන්වනවා'],
    [/(^|[\s.,!?*()\[\]~_])ලබා\s*දෙන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1දෙනවා'],
    [/(^|[\s.,!?*()\[\]~_])සලකා\s*බලන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1බලනවා'],
    [/(^|[\s.,!?*()\[\]~_])බලන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1බලනවා'],
    [/(^|[\s.,!?*()\[\]~_])යවන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1යවනවා'],
    [/(^|[\s.,!?*()\[\]~_])කළ\s*හැකිය(?=[\s.,!?*()\[\]~_]|$)/g, '$1කරන්න පුළුවන්'],
  ];
  for (const [re, rep] of spokenReplacements) s = s.replace(re, rep);

  // 3. Convert any leaked Singlish invoice bottom / work-start lines into proper Sinhala script
  s = s.replace(
    /(?:advance|gewwata|gewala|karapu|karala)\s+(?:eka\s+)?(?:hari\s+)?(?:full\s+payment\s+)?(?:eka\s+)?(?:hari\s+)?(?:gewwata|gewala|karapu|karala)\s+passe[\s\S]*?(?:wada|wade|project\s+manager|team)[\s\S]*?(?=\n\n|$)/gi,
    'Advance මුදල හෝ සම්පූර්ණ මුදල ගෙවූ පසු අපගේ team එක ඔබව සම්බන්ධ කරගෙන වැඩේට අවශ්‍ය සියලුම requirements සහ විස්තර ලබාගෙන වහාම වැඩ ආරම්භ කරනවා. කරුණාකර මුදල් ගෙවා payment slip එක මෙතනට එවන්න. ඔබගේ Invoice PDF එක පහළින් එවා ඇත.'
  );
  s = s.replace(
    /(?:api\s+)?(?:wada|wade)\s+patan\s+gannawa[\s\S]*?(?:project\s+manager|team)[\s\S]*?(?=\n\n|$)/gi,
    'Advance මුදල හෝ සම්පූර්ණ මුදල ගෙවූ පසු අපගේ team එක ඔබව සම්බන්ධ කරගෙන වැඩේට අවශ්‍ය සියලුම requirements සහ විස්තර ලබාගෙන වහාම වැඩ ආරම්භ කරනවා.'
  );
  s = s.replace(
    /thank\s+you!?[^\n]*?(?:ape\s+team\s+eka\s+payment\s+slip)[\s\S]*?(?=\n\n|$)/gi,
    'ස්තූතියි! අපගේ team එක payment slip එක verify කරලා බලලා, ඉක්මනින්ම manually update කරන්නම්. Payment එක confirm වුණු ගමන්ම අපගේ team එක ඔබව සම්බන්ධ කරගෙන වැඩේට අවශ්‍ය සියලුම requirements සහ විස්තර ලබාගෙන වහාම වැඩ ආරම්භ කරනවා.'
  );

  return s;
}

/**
 * Checks whether an incoming message or media attachment represents a payment slip,
 * transfer receipt, or a customer reporting that they have paid.
 *
 * Supports English, Singlish, and Sinhala expressions, as well as media attachments
 * ([IMAGE] / [DOCUMENT]) when accompanied by slip keywords or in context of an invoice/payment.
 */
export function isPaymentSlipOrPaidMessage(
  text?: string,
  mediaType?: string,
  hasInvoiceOrBankContext: boolean = false
): boolean {
  if (!text && !mediaType) return false;
  const raw = (text || '').trim();
  const clean = raw.toLowerCase();

  // 1. Explicit English payment confirmation / slip keywords
  const englishPaidPattern = /\b(?:(?:i(?:'ve| have)?\s+)?paid|already\s+paid|paid\s+already|paid\s+done|payment\s+(?:done|completed|made|sent|transferred|success|successful)|(?:done|made|sent)\s+payment|(?:money\s+)?transferred|bank\s+transfer\s+done|transfer\s+(?:completed|done)|(?:sent|transferred)\s+(?:the\s+)?amount|(?:here\s+is|attached)\s+(?:the\s+)?(?:slip|receipt)|receipt\s+attached|(?:payment|bank|deposit|transfer)\s+(?:slip|receipt)|(?:check|verify)\s+(?:the\s+)?(?:slip|receipt|payment))\b/i;
  if (englishPaidPattern.test(clean)) return true;

  // 2. Explicit Singlish payment confirmation / slip keywords
  const singlishPaidPattern = /\b(?:(?:mama\s+)?(?:gewwa|geva|gevva|gewa)|salli\s+(?:gewwa|geva|gevva|damma|dapu|yawwa|transfer\s*ka[lr]a)|mama\s+salli\s+(?:damma|gewwa|yawwa)|slip\s*(?:eka)?\s*(?:damma|ewwa|evwa|yawwa|send\s*kala|attach\s*kala|balanna|check\s*karanna)|menna\s+(?:slip|receipt|slip\s*eka|receipt\s*eka)|payment\s*(?:eka)?\s*(?:ka[lr]a|damma|e[wv]wa|done|transfer\s*ka[lr]a)|transfer\s*(?:eka)?\s*(?:ka[lr]a|damma|done|completed))\b/i;
  if (singlishPaidPattern.test(clean)) return true;

  // 3. Explicit Sinhala (Unicode) payment confirmation / slip keywords
  const sinhalaPaidPattern = /(?:ගෙව්වා|ගෙවුවා|ගෙවීම\s*කළා|ගෙවීම\s*සිදුකළා|ගෙවීම්\s*කළා|ගෙවලා\s*තියෙන්නේ|ගෙවලා\s*ඉවරයි|සල්ලි\s*දැම්මා|මුදල්\s*දැම්මා|මුදල්\s*තැන්පත්\s*කළා|සල්ලි\s*transfer\s*කළා|මුදල්\s*ගෙව්වා|සල්ලි\s*ගෙව්වා|ස්ලිප්\s*එක\s*(?:දැම්මා|එව්වා|බලන්න|චෙක්\s*කරන්න|evva|damma)|මෙන්න\s*(?:ස්ලිප්|රිසිට්)|ස්ලිප්\s*පත|රිසිට්\s*පත|ගෙවීම්\s*රිසිට්පත|ගෙවීමේ\s*රිසිට්පත|රිසිට්පත|ස්ලිප්පත|ගෙවීම\s*පරීක්ෂා|ගෙවීම\s*බලා)/;
  if (sinhalaPaidPattern.test(raw)) return true;

  // 4. Media file handling (WhatsApp image or PDF document)
  const isMedia =
    mediaType === 'image' ||
    mediaType === 'document' ||
    /^\[(?:IMAGE|DOCUMENT)\]/i.test(clean);

  if (isMedia) {
    // If the media message includes payment-related caption or terms
    if (/\b(slip|receipt|paid|transfer|deposit|bank|gewwa|damma|salli|ස්ලිප්|ගෙව්වා|සල්ලි|රිසිට්)\b/i.test(clean)) {
      return true;
    }
    // If an invoice was issued or bank details were provided in this conversation,
    // any subsequent image or document sent by the customer is treated as a payment slip
    if (hasInvoiceOrBankContext) {
      return true;
    }
  }

  return false;
}


/**
 * Safely parses string or JSONB array of URLs into string array
 */
export function parseJsonUrls(val: any): string[] {
  if (!val) return [];
  try {
    const arr = Array.isArray(val) ? val : typeof val === 'string' ? JSON.parse(val) : [];
    return Array.isArray(arr) ? arr.filter((i) => typeof i === 'string' && i.trim().length > 0) : [];
  } catch {
    return [];
  }
}

/**
 * Checks whether an incoming message is requesting samples, portfolios, or examples
 */
export function isSampleRequest(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase();
  return /\b(samples?|portfolio|portfolios|demo|demos)\b/i.test(clean) ||
    /(?:සාම්පල|සාම්පල්|පින්තූර|පින්තුර)/.test(clean) ||
    /\b(?:sample|karapu)\s*(?:weda|work|designs?)\b/i.test(clean) ||
    /\b(?:photos?|images?|pics?|pictures?)\s*(?:ewanna|evanna|balanna|danna|send|show|share|thiyenawada|thiyeda)\b/i.test(clean) ||
    /\b(?:send|show|share|see|view)\s+(?:photos?|images?|pics?|work|samples?|designs?)\b/i.test(clean) ||
    /\b(?:weda|designs?)\s*(?:balanna|penna|ewanna|evanna|thiyanawada|thiyeda)\b/i.test(clean);
}

/**
 * Ensures that if a message was cut off at the end (e.g. due to max_tokens or network cutoff),
 * any dangling, incomplete sentence or phrase at the end is cleanly trimmed back to the last complete sentence.
 */
export function cleanIncompleteTrailingSentence(text: string): string {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed || /[.!?\n\)\*"':]$/.test(trimmed)) return trimmed;
  const lastIdx = Math.max(trimmed.lastIndexOf('.'), trimmed.lastIndexOf('!'), trimmed.lastIndexOf('?'), trimmed.lastIndexOf('\n'));
  return (lastIdx > 0 && lastIdx >= trimmed.length - 120) ? trimmed.slice(0, lastIdx + 1).trim() : trimmed;
}

export interface FormatMessageWithAiOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  forceAi?: boolean;
}

/**
 * Formats the entire WhatsApp message using deterministic zero-token sanitization by default,
 * saving ~700-1,200 tokens per message while ensuring pristine WhatsApp markdown and clean spacing.
 * The secondary DeepSeek pass can be activated via forceAi or ENABLE_AI_SECONDARY_FORMATTING=true.
 */
export async function formatMessageWithAI(
  text: string,
  options?: FormatMessageWithAiOptions
): Promise<string> {
  if (!text || typeof text !== 'string') return text;
  const cleanInput = fixSinhalaOrthography(text.trim());
  if (!cleanInput) return '';

  const apiKey = options?.apiKey?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
  const shouldRunAi = Boolean(options?.forceAi || process.env.ENABLE_AI_SECONDARY_FORMATTING === 'true');

  if (!shouldRunAi || !apiKey) {
    return sanitizeWhatsAppFormatting(cleanInput);
  }

  const baseUrl = (options?.baseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const rawModel = options?.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const model = (rawModel === 'deepseek-flash' || !rawModel) ? 'deepseek-chat' : rawModel;

  const systemPrompt = `You are an expert WhatsApp Message Formatter for business and customer service chats.
Your ONLY task is to take the provided draft message and format it with clean WhatsApp markdown and readable layout.

Formatting Rules:
1. DO NOT change, omit, translate, rephrase, or add ANY facts, words, prices, invoice numbers, bank account details, or customer names. Preserve the exact wording and original language (Sinhala, English, Tamil) 100%.
2. Continuous sentences: Keep every sentence completely unbroken. NEVER split a sentence across lines in the middle of a continuous thought or phrase.
3. Lists & Offerings: Put EACH bullet item, product, package, or service on its OWN separate line starting with a bullet dot (•).
   Format: • *[Item Name]* - Rs. [Price]
4. Invoice & Payment Details Layout (CRITICAL):
   - Always leave ONE empty blank line before the invoice section (between the greeting/intro confirmation sentence and *Invoice:*).
   - Put each invoice field on its own separate line with bold labels:
     *Invoice:* [Number]
     *Customer:* [Name]
     *Item:* [Item Name] (Qty: [Qty])
     *Unit Price:* Rs. [Price]
     *Total Amount:* Rs. [Total]
   - Always leave ONE empty blank line before *Bank Details:*.
   - Put each bank detail on its own separate line with bold labels:
     *Bank Details:*
     *Bank:* [Bank Name]
     *Account Name:* [Account Holder Name]
     *Account Number:* [Account Number]
     *Branch:* [Branch Name]
   - Always leave ONE empty blank line after the bank details before the closing payment instructions paragraph.
5. Line Breaks & Spacing:
   - Leave ONE empty blank line before and after lists.
   - Leave ONE empty blank line before and after section titles like *Invoice:*, *Items:*, *Bank Details:*.
   - Leave ONE empty blank line before the final closing question or closing payment instructions.
6. Bold Styling: Bold field labels and section titles using single asterisks: *Label:* value (e.g. *Invoice:*, *Customer:*, *Item:*, *Unit Price:*, *Total Amount:*, *Bank Details:*, *Bank:*, *Account Name:*, *Account Number:*, *Branch:*).
7. Ban on Emojis: Do NOT output any emoji icons.
8. Correct Sinhala Spelling: In Sinhala, always use correct orthography with Yansaya (e.g. write "අවශ්‍ය", NEVER "අවශ්ය").
9. Output ONLY the cleanly formatted message text. Do not include any preface, notes, or explanations.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanInput },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      const formatted = data.choices?.[0]?.message?.content?.trim();
      if (formatted && formatted.length > 5) {
        return sanitizeWhatsAppFormatting(stripEmojis(formatted));
      }
    } else {
      console.warn(`[AI Formatter] Secondary formatting API returned HTTP ${response.status}. Using draft message.`);
    }
  } catch (err: any) {
    console.warn(`[AI Formatter] Secondary formatting API failed (${err.message || err}). Using draft message.`);
  }

  return sanitizeWhatsAppFormatting(cleanInput);
}

/**
 * Extracts and standardizes bank transfer details from company overview or business policy text
 */
export function extractBankDetails(text?: string): string {
  if (!text || typeof text !== 'string') return '';

  const bankMatch = text.match(/(?:Bank(?:\s+Transfer)?|Payment(?:\s+Options|\s+Details)?|බැංකු\s*විස්තර)[\s\S]*?(?:Commercial|Sampath|BOC|HNB|NDB|NSB|People'?s|DFCC|Seylan|Cargills|Account\s*(?:Name|Number|No)|100\d{6,})[\s\S]*?(?=\n\s*\n\s*\d+\.|\n\s*\n\s*[A-Z*]|\n\s*Card|$)/i);

  const targetText = bankMatch ? bankMatch[0] : text;
  const lines = targetText.split(/\r?\n/).map(l => l.replace(/^[\s*•\-–\d.]+/, '').trim()).filter(Boolean);

  let bankName = '';
  let accountName = '';
  let accountNumber = '';
  let branch = '';

  for (const line of lines) {
    const bankNameMatch = line.match(/(?:Bank|බැංකුව)\s*:\s*(.+)/i) ||
      line.match(/\b(Commercial\s*Bank|Sampath\s*Bank|Bank\s*of\s*Ceylon|BOC|HNB|Hatton\s*National\s*Bank|People'?s\s*Bank|NDB|Seylan\s*Bank|NSB|DFCC)\b(?:\s*[-–]\s*(.+))?/i);
    if (bankNameMatch && !bankName) {
      bankName = bankNameMatch[1]?.trim() || '';
      if (bankNameMatch[2]) branch = bankNameMatch[2].trim();
      continue;
    }

    const accNameMatch = line.match(/(?:Account\s*Name|Acc\s*Name|නම)\s*:\s*(.+)/i);
    if (accNameMatch && !accountName) {
      accountName = accNameMatch[1].trim();
      continue;
    }

    const accNumMatch = line.match(/(?:Account\s*(?:Number|No)|Acc\s*(?:No|Number)|ගිණුම්\s*අංකය)\s*:\s*([\d\s-]+)/i) ||
      line.match(/\b(\d{8,16})\b/);
    if (accNumMatch && !accountNumber) {
      accountNumber = accNumMatch[1].replace(/[\s-]/g, '').trim();
      continue;
    }

    const branchMatch = line.match(/(?:Branch|ශාඛාව)\s*:\s*(.+)/i);
    if (branchMatch && !branch) {
      branch = branchMatch[1].trim();
      continue;
    }
  }

  if (bankName || accountNumber) {
    const parts = ['*Bank Details:*'];
    if (bankName) parts.push(`*Bank:* ${bankName}`);
    if (accountName) parts.push(`*Account Name:* ${accountName}`);
    if (accountNumber) parts.push(`*Account Number:* ${accountNumber}`);
    if (branch) parts.push(`*Branch:* ${branch}`);
    return parts.join('\n');
  }

  return '';
}



