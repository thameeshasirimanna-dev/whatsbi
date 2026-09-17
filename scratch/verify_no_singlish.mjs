import assert from 'node:assert';
import { buildAgentPrompt } from '../../backend/dist/services/ai-prompt-builder.js';
import { naturalizeSinhalaPhrasing } from '../../backend/dist/services/ai-formatters.js';

console.log('--- Testing Strict Singlish Ban & Invoice Bottom Phrasing ---');

// 1. Verify AI System Prompt Builder Instructions
const mockAgent = {
  id: 1,
  name: 'Spark Studio',
  business_name: 'Spark Studio',
  business_type: 'service',
  tone: 'professional',
};
const mockCustomer = { name: 'Kusal Sirimanna', phone: '94771234567' };
const mockCatalog = 'Packages:\n1. Starter Spark - LKR 1000.00\n2. Pro Spark - LKR 5000.00';

const prompt = buildAgentPrompt({
  agent: mockAgent,
  customer: mockCustomer,
  catalogContext: mockCatalog,
});

// Verify strict ban on Singlish is prominent
assert(prompt.includes('STRICT BAN ON SINGLISH'), 'Prompt must enforce STRICT BAN ON SINGLISH');
assert(prompt.includes('NEVER EVER send messages in Singlish'), 'Prompt must prohibit Singlish');
assert(prompt.includes('සිංහල අකුරෙන් පමණි'), 'Prompt must require Sinhala Unicode script only');

// Verify no Singlish examples remain in the prompt
assert(!prompt.includes('Advance eka hari full payment eka hari'), 'Prompt must NOT contain Singlish invoice bottom example');
assert(!prompt.includes('Ita passe ape project manager'), 'Prompt must NOT contain Singlish project manager text');
assert(!prompt.includes('Karunakara gewala payment slip eka'), 'Prompt must NOT contain Singlish payment slip text');
assert(!prompt.includes('Ape team eka payment slip eka verify karala'), 'Prompt must NOT contain Singlish Stage C text');

console.log('✔ Prompt Builder verified: Zero Singlish examples, strict ban enforced.');

// 2. Verify naturalizeSinhalaPhrasing Sanitizer
const sampleSinglishInvoiceBottom = `*Invoice:* #INV-0099
*Customer:* Kusal Sirimanna
*Total Amount:* LKR 1000.00

*Bank Details:*
*Bank:* Commercial Bank
*Account Number:* 1234567890

Advance eka hari full payment eka hari gewwata passe api wada patan gannawa. Ita passe ape project manager requirements ganna ikmaninma oyawa contact karai. Karunakara gewala payment slip eka methanata ewanna. Oyage Invoice PDF eka pahalin ewa atha.`;

const sanitized = naturalizeSinhalaPhrasing(sampleSinglishInvoiceBottom);
assert(!sanitized.includes('Advance eka hari'), 'Sanitizer must remove Singlish from invoice bottom');
assert(!sanitized.includes('api wada patan gannawa'), 'Sanitizer must remove Singlish work start');
assert(sanitized.includes('Advance මුදල හෝ සම්පූර්ණ මුදල ගෙවූ පසු අපි වහාම වැඩ ආරම්භ කරනවා'), 'Sanitizer must convert to pure Sinhala script');
assert(sanitized.includes('අපගේ project manager අවශ්‍යතා (requirements) ලබා ගැනීමට'), 'Sanitizer must use proper Sinhala script for PM');

console.log('✔ Sanitizer verified: Automatically converts any Singlish invoice bottom lines into proper Sinhala script.');
console.log('All tests passed successfully!');
