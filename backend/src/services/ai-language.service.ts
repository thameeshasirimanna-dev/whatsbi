/**
 * Service for detecting customer language preferences, dynamic language switching,
 * and persisting language preferences to the database.
 */

export type SupportedLanguage = 'english' | 'tamil' | 'sinhala';

/**
 * Detects if a customer has explicitly expressed a language preference or stated
 * they do not know/understand Sinhala.
 */
export function detectLanguagePreference(
  text?: string,
  currentLanguage?: string
): SupportedLanguage | null {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Explicit English switch or statement that customer does not know Sinhala
  const englishPatterns = [
    /\b(?:i\s+)?don'?t\s+(?:know|understand|speak|read|chat\s+in)\s+sinhala\b/i,
    /\b(?:no|not)\s+sinhala\b/i,
    /\b(?:sinhala|sinhal)\s+(?:b[aä]|danna\s+b[aä]|bahe?|theren+e?\s+n[aä]|therenne\s+n[aä]|danna\s+n[aä]|danna\s+na)\b/i,
    /\b(?:can\s+(?:you|we)\s+)?(?:speak|chat|talk|reply|write|message|communicate)\s+(?:in\s+)?english\b/i,
    /\b(?:please\s+)?(?:speak|talk|reply|switch\s+to|chat\s+in)\s+english\b/i,
    /\benglish\s+(?:please|plz|only|walin|eken)\b/i,
    /\bdo\s+you\s+speak\s+english\b/i,
    /\bcan\s+we\s+(?:talk|chat)\s+in\s+english\b/i,
    /\benglish\s+medium\b/i,
    /\btype\s+in\s+english\b/i,
    /\bspeak\s+english\b/i,
    /\benglish\s+wala\s+kiyanna\b/i,
  ];

  for (const p of englishPatterns) {
    if (p.test(lower)) return 'english';
  }

  // 2. Explicit Tamil switch or Tamil script
  const tamilPatterns = [
    /\b(?:can\s+(?:you|we)\s+)?(?:speak|chat|talk|reply|write)\s+(?:in\s+)?tamil\b/i,
    /\btamil\s+(?:please|plz|only|theriyuma|pesunga|pesalam)\b/i,
    /\b(?:please\s+)?(?:speak|talk|reply|switch\s+to)\s+tamil\b/i,
    /\btamil\s+la\s+(?:pesunga|solunga)\b/i,
  ];

  for (const p of tamilPatterns) {
    if (p.test(lower)) return 'tamil';
  }

  // Detect genuine Tamil unicode script (3 or more Tamil characters)
  const tamilChars = clean.match(/[\u0B80-\u0BFF]/g);
  if (tamilChars && tamilChars.length >= 3) {
    return 'tamil';
  }

  // 3. Explicit switch back to Sinhala
  const sinhalaPatterns = [
    /\b(?:speak|talk|reply|switch\s+to)\s+(?:in\s+)?sinhala\b/i,
    /\bsinhala\s+(?:please|plz|walin|eken|puluwanda)\b/i,
    /(?:සිංහලෙන්|සිංහලෙන්\s*කතා|සිංහල\s*පුළුවන්ද)/,
  ];

  for (const p of sinhalaPatterns) {
    if (p.test(lower) || p.test(clean)) return 'sinhala';
  }

  return null;
}

/**
 * Standardizes language string to canonical representation ('english', 'tamil', 'sinhala')
 */
export function normalizeLanguageCode(lang?: string): SupportedLanguage {
  if (!lang) return 'sinhala';
  const l = lang.toLowerCase().trim();
  if (l === 'en' || l.startsWith('eng')) return 'english';
  if (l === 'ta' || l.startsWith('tam')) return 'tamil';
  if (l === 'si' || l.startsWith('sin')) return 'sinhala';
  return 'sinhala';
}

/**
 * Detects if the incoming message requires switching the customer's language,
 * and if so, updates the customer record in {agent_prefix}_customers table immediately.
 */
export async function detectAndApplyCustomerLanguageChange({
  agent,
  customer,
  incomingText,
  pgClient,
}: {
  agent: any;
  customer: any;
  incomingText?: string;
  pgClient: any;
}): Promise<SupportedLanguage | null> {
  if (!incomingText || !customer || !agent?.agent_prefix) return null;

  const currentLang = normalizeLanguageCode(customer.language);
  const targetLanguage = detectLanguagePreference(incomingText, currentLang);

  if (targetLanguage && targetLanguage !== currentLang) {
    try {
      const customersTable = `${agent.agent_prefix}_customers`;
      await pgClient.query(
        `UPDATE ${customersTable} SET language = $1 WHERE id = $2`,
        [targetLanguage, customer.id]
      );
      customer.language = targetLanguage;
      console.log(
        `[AI Language] Customer ${customer.id} (${customer.phone || customer.name}) language changed from '${currentLang}' to '${targetLanguage}' in database.`
      );
      return targetLanguage;
    } catch (err: any) {
      console.error(
        `[AI Language] Failed to update customer ${customer.id} language to '${targetLanguage}':`,
        err.message || err
      );
    }
  }

  return null;
}
