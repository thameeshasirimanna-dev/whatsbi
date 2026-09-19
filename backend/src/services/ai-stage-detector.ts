/**
 * Conversation Stage Detector for AI Chatbot
 *
 * Dynamically determines the active conversational stage (inquiry, confirmation, paid, appointment)
 * to allow targeted system prompt modularization, saving significant LLM input tokens and cost.
 */

import { isPaymentSlipOrPaidMessage } from './ai-formatters.js';

export type ConversationStage = 'inquiry' | 'confirmation' | 'paid' | 'appointment';

export const ConversationStage = {
  INQUIRY: 'inquiry' as const,
  CONFIRMATION: 'confirmation' as const,
  PAID: 'paid' as const,
  APPOINTMENT: 'appointment' as const,
};

export interface StageDetectorOptions {
  incomingText?: string;
  incomingMediaType?: string;
  hasInvoiceOrBankContext?: boolean;
  conversationHistory?: Array<{ role: string; content: string }>;
}

/**
 * Checks whether an incoming message indicates explicit order confirmation or request for invoice/bill
 */
export function isOrderConfirmationIntent(
  text?: string,
  conversationHistory?: Array<{ role: string; content: string }>
): boolean {
  if (!text || typeof text !== 'string') return false;
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Explicit English confirmation & purchase/update intent
  const englishConfirmPattern = /\b(?:(?:please\s+)?(?:confirm(?:\s+(?:my\s+)?order)?)|order\s+it|place\s+(?:an?\s+)?order|proceed|let'?s\s+proceed|i(?:'ll|\s+will|\s+want\s+to)\s+(?:take|buy|order|book|confirm)(?:\s+it)?|i\s+want\s+(?:this|that|one)|send\s+(?:me\s+)?(?:the\s+)?(?:invoice|bill|bank\s+details|account\s+details|payment\s+details)|where\s+is\s+(?:the\s+|my\s+)?(?:invoice|bill)|book\s+it|book\s+this|i'?m\s+ready\s+to\s+(?:buy|order|pay)|(?:change|update)\s+(?:the\s+|my\s+)?(?:order|invoice|bill|quantity|items?|address)|add\s+(?:another|one\s+more)|make\s+it\s+\d+|change\s+(?:it\s+)?to\s+\d+)\b/i;
  if (englishConfirmPattern.test(lower)) return true;

  // 2. Explicit Singlish confirmation & purchase/update intent
  const singlishConfirmPattern = /\b(?:confirm\s*ka[lr]a|confirm\s*ka[lr]anna|confirm\s*krnna|order\s*ka[lr]anna|order\s*(?:eka\s*)?danna|bill\s*(?:eka\s*)?(?:ewanna|evanna|danna|hadanna)|invoice\s*(?:eka\s*)?(?:ewanna|evanna|danna|hadanna)|mata\s*(?:meka\s*)?danna|danna\s*puluwan|mama\s*gannawa|gannawa|gannam|mata\s*(?:meka\s*)?(?:ona|oni|one)|ganna\s*(?:ona|oni|one)|book\s*ka[lr]anna|bank\s*details\s*ewanna|account\s*(?:number|no|details)\s*(?:eka\s*)?ewanna|salli\s*danna\s*(?:details|wistara)\s*ewanna|idiriyata\s*(?:yamu|gamu)|(?:package|item|reel|video|service)\s*eka\s*(?:danna|ewanna|evanna|one|oni|ona|confirm|ganna)|ko\s*(?:the\s*)?invoice|ko\s*(?:the\s*)?bill|invoice\s*(?:eka\s*)?ko|bill\s*(?:eka\s*)?ko|ko\s*invoice\s*eka|ko\s*bill\s*eka|invoice\s*thama\s*(?:awe|awe\s*na)|ewannako\s*invoice|bill\s*(?:eka\s*)?update|invoice\s*(?:eka\s*)?update|order\s*(?:eka\s*)?update|bill\s*(?:eka\s*)?wenas|invoice\s*(?:eka\s*)?wenas|thawa\s*(?:ekak|dekak|\d+)|items?\s*wenas|gana\s*wenas)\b/i;
  if (singlishConfirmPattern.test(lower)) return true;

  // 3. Explicit Sinhala (Unicode) confirmation & purchase/update intent
  const sinhalaConfirmPattern = /(?:තහවුරු\s*කරන්න|කන්ෆර්ම්\s*කරන්න|කන්ෆම්\s*කරන්න|බිල\s*(?:එවන්න|දාන්න|හදන්න)|ඉන්වොයිස්\s*(?:එක\s*)?(?:එවන්න|දාන්න|හදන්න)|ඇණවුම\s*තහවුරු|මට\s*මේක\s*දාන්න|මම\s*ගන්නවා|ගන්නම්|මේක\s*(?:ඕනෙ|ඕනේ|අවශ්‍යයි|අවශ්යයි|අවශ්‍ය|අවශ්ය)|ගන්න\s*(?:ඕනෙ|ඕනේ|අවශ්‍යයි|අවශ්යයි|අවශ්‍ය|අවශ්ය)|බැංකු\s*විස්තර\s*එවන්න|ගෙවන්න\s*විස්තර\s*එවන්න|ඉදිරියට\s*(?:යමු|ගමු)|ඕඩර්\s*කරන්න|ඇණවුම්\s*කරන්න|(?:package|item|reel|video|service)\s*එක\s*(?:දාන්න|එවන්න|ඕනෙ|ඕනේ|අවශ්‍යයි|අවශ්යයි|අවශ්‍ය|අවශ්ය|තහවුරු|ගන්න)|කෝ\s*ඉන්වොයිස්|කෝ\s*බිල|ඉන්වොයිස්\s*(?:එක\s*)?කෝ|බිල\s*කෝ|බිල\s*වෙනස්|ඉන්වොයිස්\s*එක\s*වෙනස්|ඇණවුම\s*වෙනස්|තව\s*(?:එකක්|දෙකක්|\d+)|ප්‍රමාණය\s*වෙනස්)/;
  if (sinhalaConfirmPattern.test(raw)) return true;

  // 4. Contextual Confirmation: If the assistant previously asked a confirmation question
  // and user answers with an affirmative word (e.g. "ha", "yes", "ow", "hari", "ok", "ela", "sure")
  if (conversationHistory && conversationHistory.length > 0) {
    const lastAssistantMsg = [...conversationHistory].reverse().find((m) => m.role === 'assistant');
    if (lastAssistantMsg?.content) {
      const isLastMsgConfirmationQuestion =
        /(?:confirm(?:\s+this)?\s+order|place\s+an\s+order|generate\s+your\s+invoice|confirm\s*කරන්න|order\s*eka\s*confirm|තහවුරු\s*කිරීමට|ඉන්වොයිස්\s*එක\s*(?:එවන්නම්|හදලා\s*එවන්නද|දාන්නද)|invoice\s*eka\s*(?:ewannam|ewannada|danna)|කියන්න,\s*අපි\s*Invoice|(?:කැමති|අවශ්‍ය|අවශ්ය)\s*නම්\s*කියන්න|order\s*එක\s*confirm|තහවුරු\s*කරන්න\s*ඕනෙද|(?:invoice|බිල|order|ඇණවුම|confirm|තහවුරු)[\s\S]{0,35}(?:එවන්නද|හදන්නද|දාන්නද|ඕනෙද|ඕනද|කරන්නද|\?))/i.test(lastAssistantMsg.content);

      if (isLastMsgConfirmationQuestion) {
        const shortAffirmative = /^(?:yes|yep|yeah|yup|sure|ok|okay|okk|okey|k|done|ha|haa|ha\s*hari|haa\s*hari|ha\s*danna|ow\s*danna|hari\s*danna|danna|ha\s*ewanna|ow\s*ewanna|hari\s*ewanna|ow|ou|ov|hari|ela|elama|kamathi|kamathiyi|plz|please|proceed|oww|hmm|hmmm|හා|හ්ම්|හ්ම්ම්|ඔව්|හරි|එල|එළ|කැමතියි|කැමති|දාන්න)[.!?\s]*$/i;
        if (shortAffirmative.test(lower)) return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether an incoming message is requesting an appointment or meeting
 */
export function isAppointmentIntent(
  text?: string,
  conversationHistory?: Array<{ role: string; content: string }>
): boolean {
  if (!text || typeof text !== 'string') return false;
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Explicit English appointment & meeting patterns
  const englishApptPattern = /\b(?:appointment|appointments|meeting|consultation|schedule|book\s+(?:a\s+)?(?:call|meeting|appointment|slot|consultation)|can\s+we\s+meet|let'?s\s+meet|meet\s+up|discuss\s+(?:the\s+)?(?:project|details)|call\s+me|schedule\s+a\s+time|zoom(?:\s+call|\s+meeting)?|google\s+meet|reschedule|change\s+(?:the\s+|my\s+)?(?:appointment|meeting|time|date)|move\s+(?:the\s+|my\s+)?(?:appointment|meeting)|different\s+(?:time|day|date)|update\s+(?:the\s+|my\s+)?(?:appointment|meeting))\b/i;
  if (englishApptPattern.test(lower)) return true;

  // 2. Explicit Singlish appointment & meeting patterns
  const singlishApptPattern = /\b(?:appointment\s*(?:ekak|danna|daganna|one|oni|ona|hadanna|hamba\s*wenna)|meeting\s*(?:ekak|danna|daganna|one|oni|ona|yamu)|call\s*(?:ekak|ganna|danna)|meet\s*wemu|meet\s*wenna|meet\s*ekak|welawak\s*(?:daganna|danna|ona|oni|ona|wen\s*karanna)|time\s*(?:slot\s*)?(?:ekak|danna|daganna)|katha\s*karanna\s*puluwanda|consultation\s*(?:ekak|danna)|reschedule\s*ka[lr]anna|welaawa\s*wenas|dawas\s*wenas|appointment\s*eka\s*wenas|wena\s*dawasaka|wena\s*welawaka|time\s*eka\s*change|change\s*karanna|update\s*karanna)\b/i;
  if (singlishApptPattern.test(lower)) return true;

  // 3. Explicit Sinhala (Unicode) appointment & meeting patterns
  const sinhalaApptPattern = /(?:හමුවෙන්න|හමුවන්න|හමුවෙමු|හමු\s*වෙන්න|කතා\s*කරන්න|කතාකරන්න|ඇපොයින්ට්මන්ට්|ඇපොයින්මන්ට්|වෙලාවක්|කාලයක්|දිනයක්|මීටින්|කෝල්\s*එකක්|සාකච්ඡා\s*කරන්න|වෙන්\s*කරන්න|වෙන්\s*කරවා|දිනයක්\s*වෙන්|වෙලාවක්\s*වෙන්|වෙලාව\s*වෙනස්|දිනය\s*වෙනස්|වෙනස්\s*කරන්න|වෙන\s*දවසක|වෙන\s*වෙලාවක|ඇපොයින්ට්මන්ට්\s*එක\s*වෙනස්)/;
  if (sinhalaApptPattern.test(raw)) return true;

  // 4. Contextual Appointment Detection:
  // If the assistant previously asked for date/time/appointment details,
  // and the user responds with a date, day, time, or temporal slot
  if (conversationHistory && conversationHistory.length > 0) {
    const lastAssistantMsg = [...conversationHistory].reverse().find((m) => m.role === 'assistant');
    if (lastAssistantMsg?.content) {
      const isLastMsgAppointmentPrompt =
        /(?:appointment|meeting|consultation|preferred\s+(?:date|time)|what\s+(?:date|time)|schedule|දිනය\s*සහ\s*වේලාව|කැමති\s*(?:දිනය|වෙලාව|වේලාව)|හමුවීමට\s*කැමති|ඇපොයින්ට්මන්ට්|මීටින්|date\s*and\s*time|which\s+day|what\s+time)/i.test(
          lastAssistantMsg.content
        );

      if (isLastMsgAppointmentPrompt) {
        // Check if customer response contains temporal tokens (date, time, day, relative words)
        const temporalTokensPattern =
          /\b(?:tomorrow|today|tonight|morning|afternoon|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|am|pm|o'?clock|\d{1,2}(?::\d{2})?\s*(?:am|pm)?|heta|ada|ude|hawasa|dawal|re|ra|anidda)\b/i;
        const sinhalaTemporalPattern =
          /(?:හෙට|අද|අනිද්දා|උදේ|උදෑසන|දවල්|හවස|සවස|රාත්‍රී|රෑ|සඳුදා|අඟහරුවාදා|බදාදා|බ්‍රහස්පතින්දා|සිකුරාදා|සෙනසුරාදා|ඉරිදා|\d{1,2}(?:\.\d{2}|:\d{2})?ට?)/;

        if (temporalTokensPattern.test(lower) || sinhalaTemporalPattern.test(raw)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Detects the active conversation stage to optimize prompt loading and save AI tokens
 */
export function detectConversationStage(options: StageDetectorOptions): ConversationStage {
  const { incomingText, incomingMediaType, hasInvoiceOrBankContext = false, conversationHistory } = options;

  // Fallback to latest customer message in history if incomingText is empty or whitespace
  const effectiveIncoming = incomingText && incomingText.trim()
    ? incomingText.trim()
    : ([...(conversationHistory || [])].reverse().find((m) => m.role === 'user')?.content || '');

  // 1. Payment receipt stage: customer sent slip or said they paid
  if (isPaymentSlipOrPaidMessage(effectiveIncoming, incomingMediaType, hasInvoiceOrBankContext)) {
    return 'paid';
  }

  // 2. Order confirmation stage: customer explicitly confirmed or said yes to placing order
  if (isOrderConfirmationIntent(effectiveIncoming, conversationHistory)) {
    return 'confirmation';
  }

  // 3. Appointment booking stage
  if (isAppointmentIntent(effectiveIncoming, conversationHistory)) {
    return 'appointment';
  }

  // 4. Default: Inquiry stage (lightweight, zero invoice instructions loaded)
  return 'inquiry';
}
