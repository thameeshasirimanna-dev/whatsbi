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
/**
 * Formats message spacing and line breaks for WhatsApp:
 * 1. Puts each bullet point (•, -, ▪) on its own separate line.
 * 2. Puts each numbered list item (1., 2.) on its own separate line.
 * 3. Puts invoice, appointment, package, and bank fields on their own separate lines.
 * 4. Ensures double line breaks (\n\n) before major section headings (Bank Details, Invoice, etc.).
 * 5. Ensures double line breaks before closing paragraphs following field blocks.
 * 6. Fixes missing spaces after punctuation and around bold markers.
 * 7. Standardizes bold labels and cleans up excessive consecutive newlines.
 */
export function formatMessageSpacingAndLineBreaks(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let formatted = text;

  // 1. Fix missing space after sentence punctuation (. ! ?) when immediately followed by capital/Sinhala letter or bold tag (without breaking URLs like .com/.lk)
  formatted = formatted.replace(/([^0-9/:\s.]{2,}[.!?])(?=[A-Z\u0D80-\u0DFF])/g, '$1 ');
  formatted = formatted.replace(/([.!?])(\*[a-zA-Z0-9\u0D80-\u0DFF])/g, '$1 $2');

  // 2. Fix missing space around bold asterisks (e.g. "Rs.4000*Bank:*" -> "Rs.4000 *Bank:*")
  formatted = formatted.replace(/([a-zA-Z0-9\u0D80-\u0DFF])(\*[a-zA-Z0-9\u0D80-\u0DFF])/g, '$1 $2');
  formatted = formatted.replace(/(\*[a-zA-Z0-9\u0D80-\u0DFF.,!?:]+\*)([a-zA-Z0-9\u0D80-\u0DFF])/g, '$1 $2');

  // 3. Ensure a space immediately after a colon in bold field labels: *Field:*value -> *Field:* value
  formatted = formatted.replace(/(\*[a-zA-Z0-9\u0D80-\u0DFF\s]+:\*)(?=[^\s\n*])/g, '$1 ');

  // 4. Split inline bullet points onto new lines
  formatted = formatted.replace(/([^\n])\s+([•◦▪]|-(?=\s+\*?[a-zA-Z0-9\u0D80-\u0DFF]))/g, '$1\n$2');

  // 5. Split inline numbered list items (e.g. "1. First 2. Second") onto new lines
  formatted = formatted.replace(/([^\n])\s+(\d+\.\s+\*?[a-zA-Z0-9\u0D80-\u0DFF])/g, '$1\n$2');

  // 6. Split inline metadata / invoice / appointment / bank fields onto their own lines
  const inlineFieldLabels = [
    'Invoice(?:\\s*Number|\\s*No)?',
    'Customer(?:\\s*Name)?',
    'Item(?:s)?',
    'Service(?:s)?',
    'Package(?:s)?',
    'Quantity|Qty',
    'Unit\\s*Price|Price',
    'Total(?:\\s*Amount)?',
    'Subtotal',
    'Advance(?:\\s*Amount)?',
    'Balance(?:\\s*Due)?',
    'Date',
    'Time',
    'Appointment(?:\\s*Date|\\s*Time)?',
    'Bank(?:\\s*Name)?',
    'Account\\s*Name|Acc\\s*Name|Account\\s*Holder|Beneficiary',
    'Account\\s*No(?:\\.|umber)?|Acc\\s*No(?:\\.|umber)?|A\\/C\\s*No(?:\\.|umber)?|A\\/C',
    'Branch(?:\\s*Name)?',
    'SWIFT(?:\\s*Code)?|IBAN',
    'Sample\\s*Work|Portfolio',
    'Download\\s*Invoice\\s*PDF',
    'බැංකුව',
    'ගිණුමේ\\s*නම',
    'ගිණුම්\\s*අංකය',
    'ශාඛාව',
    'මිල',
    'මුළු\\s*මුදල',
    'දිනය',
    'වේලාව',
  ].join('|');

  const inlineFieldRegex = new RegExp(`([^\\n])(?:[ \\t]{2,}|[ \\t]+)(?=\\*?(?:${inlineFieldLabels})\\*?\\s*[:\\-–—])`, 'gi');
  formatted = formatted.replace(inlineFieldRegex, '$1\n');

  // 7. Ensure clear double line breaks (\n\n) before major section headings
  const sectionHeaders = [
    'Bank\\s*Details',
    'Invoice\\s*Details',
    'Order\\s*Summary',
    'Appointment\\s*(?:Details|Confirmed)',
    'Available\\s*Packages',
    'Package\\s*Options',
    'Services\\s*Offered',
    'බැංකු\\s*විස්තර',
    'ඇණවුම්\\s*සාරාංශය',
  ].join('|');

  const sectionHeaderRegex = new RegExp(`([^\\n])(?:\\s*)(?=\\*?(?:${sectionHeaders})\\*?\\s*[:\\-–—]?)`, 'gi');
  formatted = formatted.replace(sectionHeaderRegex, '$1\n\n');

  // 8. Ensure line break between section heading and its first field/bullet
  formatted = formatted.replace(/(\*?(?:Bank\s*Details|Order\s*Summary|Appointment\s*Confirmed|බැංකු\s*විස්තර)\*?\s*[:\-–—]?)[ \t]+(?=\*?[a-zA-Z0-9\u0D80-\u0DFF•])/gi, '$1\n');

  // 9. Separate trailing instruction / closing sentence after fields onto its own paragraph (\n\n)
  const trailingSentenceRegex = /((?:Branch|ශාඛාව|Account\s*No|Acc\s*No|A\/C\s*No|Total\s*Amount|මුළු\s*මුදල|Balance|Time)\*?\s*[:\-–—]\s*[^\n.]+?\.)\s+([A-Z\u0D80-\u0DFF][^\n]{4,})/gi;
  formatted = formatted.replace(trailingSentenceRegex, '$1\n\n$2');

  // 10. Standardize and bold the common field labels for consistent presentation (safely consuming all asterisks before and after colon)
  formatted = formatted
    .replace(/^([ \t]*)\*{0,3}(?:Bank(?:\s*Name|\s*eka)?)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Bank:* ')
    .replace(/^([ \t]*)\*{0,3}(?:Account\s*Name(?:\s*eka)?|Acc\s*Name(?:\s*eka)?|Account\s*Holder|Beneficiary(?:\s*Name)?)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Account Name:* ')
    .replace(/^([ \t]*)\*{0,3}(?:Account\s*No(?:\.|umber)?(?:\s*eka)?|Acc\s*No(?:\.|umber)?(?:\s*eka)?|A\/C\s*No(?:\.|umber)?(?:\s*eka)?|A\/C)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Account Number:* ')
    .replace(/^([ \t]*)\*{0,3}(?:Branch(?:\s*Name|\s*eka)?)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Branch:* ')
    .replace(/^([ \t]*)\*{0,3}(?:Invoice(?:\s*Number|\s*No)?)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Invoice:* ')
    .replace(/^([ \t]*)\*{0,3}(?:Customer(?:\s*Name)?)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Customer:* ')
    .replace(/^([ \t]*)\*{0,3}(?:Item(?:s)?)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Item:* ')
    .replace(/^([ \t]*)\*{0,3}(?:Unit\s*Price|Price)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Unit Price:* ')
    .replace(/^([ \t]*)\*{0,3}(?:Total(?:\s*Amount)?)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*Total Amount:* ')
    .replace(/^([ \t]*)\*{0,3}(?:බැංකුව)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*බැංකුව:* ')
    .replace(/^([ \t]*)\*{0,3}(?:ගිණුමේ\s*නම)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*ගිණුමේ නම:* ')
    .replace(/^([ \t]*)\*{0,3}(?:ගිණුම්\s*අංකය)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*ගිණුම් අංකය:* ')
    .replace(/^([ \t]*)\*{0,3}(?:ශාඛාව)\*{0,3}\s*[:\-–—]\s*\*{0,3}\s*/gim, '$1*ශාඛාව:* ');

  // 11. Clean up excessive blank lines (max 2 consecutive newlines)
  formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();

  return formatted;
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
  let s = text;

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

  return s.trim();
}

/**
 * Naturalizes Sinhala phrasing by converting awkward direct machine translations
 * (e.g. "5 දවස් වලට" -> "දවස් 5කට", "5 දවස් වලින්" -> "දවස් 5කින්", "එවන්නෙමු" -> "එවනවා")
 * into authentic spoken conversational Sinhala.
 */
export function naturalizeSinhalaPhrasing(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let s = text;

  // 1. Time duration: "5 දවස් වලට" / "දවස් 5 වලට" -> "දවස් 5කට"
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*(?:දවස්|දින)\s*වලට(?=[\s.,!?*()\[\]~_]|$)/g, '$1දවස් $2කට');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(?:දවස්|දින)\s*(\d+)\s*වලට(?=[\s.,!?*()\[\]~_]|$)/g, '$1දවස් $2කට');

  // 2. Future time: "5 දවස් වලින්" / "දවස් 5 වලින්" -> "දවස් 5කින්"
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*(?:දවස්|දින)\s*වලින්(?=[\s.,!?*()\[\]~_]|$)/g, '$1දවස් $2කින්');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(?:දවස්|දින)\s*(\d+)\s*වලින්(?=[\s.,!?*()\[\]~_]|$)/g, '$1දවස් $2කින්');

  // 3. "Within X days": "5 දවස් ඇතුළත" -> "දවස් 5ක් ඇතුළත"
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*(?:දවස්|දින)\s*ඇතුළත(?=[\s.,!?*()\[\]~_]|$)/g, '$1දවස් $2ක් ඇතුළත');

  // 4. Weeks: "2 සති වලට" -> "සති 2කට", "2 සති වලින්" -> "සති 2කින්"
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*සති\s*වලට(?=[\s.,!?*()\[\]~_]|$)/g, '$1සති $2කට');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])සති\s*(\d+)\s*වලට(?=[\s.,!?*()\[\]~_]|$)/g, '$1සති $2කට');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*සති\s*වලින්(?=[\s.,!?*()\[\]~_]|$)/g, '$1සති $2කින්');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])සති\s*(\d+)\s*වලින්(?=[\s.,!?*()\[\]~_]|$)/g, '$1සති $2කින්');

  // 5. Months: "3 මාස වලට" -> "මාස 3කට", "3 මාස වලින්" -> "මාස 3කින්"
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*මාස\s*වලට(?=[\s.,!?*()\[\]~_]|$)/g, '$1මාස $2කට');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])මාස\s*(\d+)\s*වලට(?=[\s.,!?*()\[\]~_]|$)/g, '$1මාස $2කට');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*මාස\s*වලින්(?=[\s.,!?*()\[\]~_]|$)/g, '$1මාස $2කින්');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])මාස\s*(\d+)\s*වලින්(?=[\s.,!?*()\[\]~_]|$)/g, '$1මාස $2කින්');

  // 6. Hours: "2 පැය වලට" -> "පැය 2කට", "2 පැය වලින්" -> "පැය 2කින්"
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*පැය\s*වලට(?=[\s.,!?*()\[\]~_]|$)/g, '$1පැය $2කට');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])පැය\s*(\d+)\s*වලට(?=[\s.,!?*()\[\]~_]|$)/g, '$1පැය $2කට');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])(\d+)\s*පැය\s*වලින්(?=[\s.,!?*()\[\]~_]|$)/g, '$1පැය $2කින්');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])පැය\s*(\d+)\s*වලින්(?=[\s.,!?*()\[\]~_]|$)/g, '$1පැය $2කින්');

  // 7. Replace literary/chatbot endings with natural spoken forms
  s = s.replace(/(^|[\s.,!?*()\[\]~_])එවන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1එවනවා');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])කරන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1කරනවා');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])දන්වන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1දන්වනවා');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])ලබා\s*දෙන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1දෙනවා');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])සලකා\s*බලන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1බලනවා');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])බලන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1බලනවා');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])යවන්නෙමු(?=[\s.,!?*()\[\]~_]|$)/g, '$1යවනවා');
  s = s.replace(/(^|[\s.,!?*()\[\]~_])කළ\s*හැකිය(?=[\s.,!?*()\[\]~_]|$)/g, '$1කරන්න පුළුවන්');

  // 8. Convert any leaked Singlish invoice bottom / work-start lines into proper Sinhala script
  s = s.replace(
    /(?:advance|gewwata|gewala|karapu|karala)\s+(?:eka\s+)?(?:hari\s+)?(?:full\s+payment\s+)?(?:eka\s+)?(?:hari\s+)?(?:gewwata|gewala|karapu|karala)\s+passe[\s\S]*?(?:wada|wade|project\s+manager)[\s\S]*?(?=\n\n|$)/gi,
    'Advance මුදල හෝ සම්පූර්ණ මුදල ගෙවූ පසු අපි වහාම වැඩ ආරම්භ කරනවා. ඊටපසු අපගේ project manager අවශ්‍යතා (requirements) ලබා ගැනීමට ඉක්මනින්ම ඔබව සම්බන්ධ කර ගනු ඇත. කරුණාකර මුදල් ගෙවා payment slip එක මෙතනට එවන්න. ඔයාගේ Invoice PDF එක පහළින් එවා ඇත.'
  );
  s = s.replace(
    /(?:api\s+)?(?:wada|wade)\s+patan\s+gannawa[\s\S]*?(?:project\s+manager)[\s\S]*?(?=\n\n|$)/gi,
    'Advance මුදල හෝ සම්පූර්ණ මුදල ගෙවූ පසු අපි වහාම වැඩ ආරම්භ කරනවා. අපගේ project manager අවශ්‍යතා (requirements) ලබා ගැනීමට ඉක්මනින්ම ඔබව සම්බන්ධ කර ගනු ඇත.'
  );
  s = s.replace(
    /thank\s+you!?[^\n]*?(?:ape\s+team\s+eka\s+payment\s+slip)[\s\S]*?(?=\n\n|$)/gi,
    'ස්තූතියි! අපගේ team එක payment slip එක verify කරලා බලලා, ඉක්මනින්ම manually update කරන්නම්. Advance එක හෝ full payment එක confirm වුණු ගමන්ම අපි වැඩේ පටන් ගන්නවා. අපේ project manager අවශ්‍යතා (requirements) ලබා ගන්න ඉක්මනින්ම ඔයාට contact කරයි.'
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
  const englishPaidPatterns = [
    /\b(?:i(?:'ve| have)?\s+)?paid\b/i,
    /\b(?:already\s+paid|paid\s+already|paid\s+done)\b/i,
    /\b(?:payment\s+(?:done|completed|made|sent|transferred|success|successful))\b/i,
    /\b(?:done\s+payment|made\s+the\s+payment|sent\s+the\s+payment)\b/i,
    /\b(?:transferred|money\s+transferred|bank\s+transfer\s+done|transfer\s+completed|transfer\s+done)\b/i,
    /\b(?:sent\s+the\s+money|transferred\s+the\s+amount|sent\s+amount)\b/i,
    /\b(?:here\s+is\s+(?:the\s+)?(?:slip|receipt)|attached\s+(?:the\s+)?(?:slip|receipt)|receipt\s+attached)\b/i,
    /\b(?:payment\s+slip|bank\s+slip|deposit\s+slip|transfer\s+slip|payment\s+receipt)\b/i,
    /\b(?:check\s+(?:the\s+)?(?:slip|receipt|payment)|verify\s+(?:the\s+)?(?:slip|receipt|payment))\b/i,
  ];
  if (englishPaidPatterns.some((p) => p.test(clean))) {
    return true;
  }

  // 2. Explicit Singlish payment confirmation / slip keywords
  const singlishPaidPatterns = [
    /\b(?:mama\s+)?(?:gewwa|geva|gevva|gewa)\b/i,
    /\b(?:salli\s+(?:gewwa|geva|gevva|damma|dapu|yawwa|transfer\s*kala|transfer\s*kara))\b/i,
    /\b(?:mama\s+salli\s+(?:damma|gewwa|yawwa))\b/i,
    /\b(?:slip\s*(?:eka)?\s*(?:damma|ewwa|evwa|yawwa|send\s*kala|attach\s*kala|balanna|check\s*karanna))\b/i,
    /\b(?:menna\s+(?:slip|receipt|slip\s*eka|receipt\s*eka))\b/i,
    /\b(?:payment\s*(?:eka)?\s*(?:kala|kara|damma|ewwa|evwa|done|transfer\s*kala|transfer\s*kara))\b/i,
    /\b(?:transfer\s*(?:eka)?\s*(?:kala|kara|damma|done|completed))\b/i,
  ];
  if (singlishPaidPatterns.some((p) => p.test(clean))) {
    return true;
  }

  // 3. Explicit Sinhala (Unicode) payment confirmation / slip keywords
  const sinhalaPaidPatterns = [
    /(?:ගෙව්වා|ගෙවුවා|ගෙවීම\s*කළා|ගෙවීම\s*සිදුකළා|ගෙවීම්\s*කළා|ගෙවලා\s*තියෙන්නේ|ගෙවලා\s*ඉවරයි)/,
    /(?:සල්ලි\s*දැම්මා|මුදල්\s*දැම්මා|මුදල්\s*තැන්පත්\s*කළා|සල්ලි\s*transfer\s*කළා|මුදල්\s*ගෙව්වා|සල්ලි\s*ගෙව්වා)/,
    /(?:ස්ලිප්\s*එක\s*(?:දැම්මා|එව්වා|බලන්න|චෙක්\s*කරන්න|evva|damma)|මෙන්න\s*(?:ස්ලිප්|රිසිට්)|ස්ලිප්\s*පත|රිසිට්\s*පත)/,
    /(?:ගෙවීම්\s*රිසිට්පත|ගෙවීමේ\s*රිසිට්පත|රිසිට්පත|ස්ලිප්පත)/,
    /(?:ගෙවීම\s*පරීක්ෂා|ගෙවීම\s*බලා)/,
  ];
  if (sinhalaPaidPatterns.some((p) => p.test(raw))) {
    return true;
  }

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
  if (Array.isArray(val)) {
    return val.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {}
  }
  return [];
}

/**
 * Checks whether an incoming message is requesting samples, portfolios, or examples
 */
export function isSampleRequest(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase();
  // Direct keywords
  if (/\b(samples?|portfolio|portfolios|demo|demos)\b/i.test(clean)) return true;
  // Sinhala keywords for sample or pictures
  if (/(?:සාම්පල|සාම්පල්|පින්තූර|පින්තුර)/.test(clean)) return true;
  // Combinations like "sample weda", "karapu weda", "photos ewanna", "pics ewanna"
  if (/\b(?:sample|karapu)\s*(?:weda|work|designs?)\b/i.test(clean)) return true;
  if (/\b(?:photos?|images?|pics?|pictures?)\s*(?:ewanna|evanna|balanna|danna|send|show|share|thiyenawada|thiyeda)\b/i.test(clean)) return true;
  if (/\b(?:send|show|share|see|view)\s+(?:photos?|images?|pics?|work|samples?|designs?)\b/i.test(clean)) return true;
  if (/\b(?:weda|designs?)\s*(?:balanna|penna|ewanna|evanna|thiyanawada|thiyeda)\b/i.test(clean)) return true;
  return false;
}

/**
 * Ensures that if a message was cut off at the end (e.g. due to max_tokens or network cutoff),
 * any dangling, incomplete sentence or phrase at the end is cleanly trimmed back to the last complete sentence.
 */
export function cleanIncompleteTrailingSentence(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let trimmed = text.trim();
  if (!trimmed) return trimmed;

  // Don't modify if it already ends with standard terminal punctuation or closures
  if (/[.!?\n\)\*"':]$/.test(trimmed)) {
    return trimmed;
  }

  // Find the last terminal punctuation mark (. ! ? \n)
  const lastTerminalIdx = Math.max(
    trimmed.lastIndexOf('.'),
    trimmed.lastIndexOf('!'),
    trimmed.lastIndexOf('?'),
    trimmed.lastIndexOf('\n')
  );

  if (lastTerminalIdx > 0 && lastTerminalIdx >= trimmed.length - 120) {
    return trimmed.slice(0, lastTerminalIdx + 1).trim();
  }

  return trimmed;
}

