# Agent Portal Style-Guide Verification & Manual Testing Guide

This document outlines the manual verification criteria, edge cases, and test protocols for the agent frontend overhaul in accordance with [`/docs/style-guide.md`](file:///c:/Github/whatsbi/docs/style-guide.md).

> [!IMPORTANT]
> **Strict Manual Execution**: The assistant never runs automated test scripts or terminal mutations. Follow the copy-pasteable verification commands and manual click-through steps below.

---

## 1. Automated Syntax & Type Verification

Before running browser manual verification, execute the TypeScript compilation check:

```bash
# In frontend directory
cd frontend
npx tsc --noEmit
```

Expected result: Clean exit with zero diagnostic errors across all decomposed agent components.

---

## 2. Style-Guide Compliance Checklist

All agent pages and subcomponents must strictly verify against these design tokens:

| Token Category | Rule Specification | Verification Check |
| :--- | :--- | :--- |
| **Primary Color** | Deep Forest `#16281D` | Page headers, active navigation, primary text |
| **Accent Color** | Vibrant Lime `#9FE870` | Primary action buttons, active toggles, badge accents |
| **Backgrounds** | Light Workspace `#F4F7F4`, Pure White `#FFFFFF` | Page canvas, cards, inputs |
| **Typography** | `Plus Jakarta Sans` | Body text, headings, modal titles |
| **Numerics / Codes** | `JetBrains Mono` (`font-mono`) | Currency amounts, dates, phone numbers, quantities |
| **Buttons** | **100% capsule buttons (`rounded-full`)** | Every trigger, save, cancel, export, filter pill |
| **Cards** | `rounded-[20px]` / `rounded-[24px]` | All KPI metrics, overview panels, table wrappers |
| **Modals & Drawers** | `rounded-3xl` container, blur backdrop `bg-[#16281D]/45 backdrop-blur-sm` | All creation wizards, edit dialogs, confirm popups |
| **Status Tokens** | 6px colored dot tokens (`#22C55E`, `#EF4444`, `#F59E0B`, `#71717A`, `#3B82F6`) | All order, appointment, broadcast, and team badges |

---

## 3. Page-by-Page Manual Test Criteria & Edge Cases

### 3.1 Invoices (`/agent/invoices`)
- **TC-INV-01 (KPI Cards)**: Verify 4 summary cards show formatted currency in `font-mono` (e.g., `LKR 15,200.00`).
- **TC-INV-02 (Toolbar Filters)**: Select status filter (`all`, `paid`, `pending`, `overdue`), search customer by name. Ensure capsule `rounded-full` controls respond smoothly.
- **TC-INV-03 (Payment Modal)**: Open Mark as Paid modal. Verify `rounded-3xl` geometry and capsule buttons. Test partial vs full payment calculations.
- **TC-INV-04 (Pagination & Mobile View)**: Test desktop table vs mobile card layout below `1024px`. Ensure responsive boundary `< 95vw` on mobile and `< 90vw` on desktop.

### 3.2 Orders (`/agent/orders` & `/agent/orders/:id`)
- **TC-ORD-01 (Bulk Actions Bar)**: Select 2+ order checkboxes. Floating bulk actions bar appears with capsule pill styling, counter badge in `font-mono`, and quick status change dropdown.
- **TC-ORD-02 (Order Analytics)**: Verify fulfillment breakdown and 6px dot status indicators.
- **TC-ORD-03 (Order Details Navigation & Page Connectivity)**:
  - From `/agent/orders` desktop table or mobile cards, click the Order ID (`#0001`) or the View (`Eye`) action button.
  - Verify that the app navigates seamlessly to `/agent/orders/:id` (`OrderDetailsPage`).
  - Verify that `OrderDetailsPage` fetches and renders the correct order by `order_id` (not default first order), displaying customer details, status badge, items breakdown, summary stats, and notes/shipping address.
  - Verify the "Back" button returns to `/agent/orders` preserving pagination state.
  - Verify that clicking "Full Details" from `ViewOrderModal` navigates to `/agent/orders/:id`.
  - Test status update dropdown and "Mark as Fully Paid" in `OrderDetailsPage`.

### 3.3 Customers (`/agent/customers`)
- **TC-CUST-01 (Analytics Grid)**: Total contacts, active pipeline, and revenue metrics displayed in `font-mono`.
- **TC-CUST-02 (Bulk Selection & Broadcast Bridge)**: Select customers and click "Create Broadcast". Verify smooth redirect to `/agent/broadcasts` with customer IDs pre-selected in wizard.

### 3.4 Appointments (`/agent/appointments`)
- **TC-APT-01 (KPI Cards & Filters)**: Check Upcoming, Completed, and Cancelled count badges.
- **TC-APT-02 (Appointment Modals)**: Create, view, edit, and cancel appointments. Verify modal backdrop blur `bg-[#16281D]/45` and `rounded-3xl` containers.

### 3.5 Inventory & Services (`/agent/inventory` & `/agent/services`)
- **TC-INV-01 (Category Section)**: Add/edit item categories. Verify category pill filters.
- **TC-INV-02 (Item Modals)**: Create item with stock, SKU, and unit price in `font-mono`.
- **TC-SRV-01 (Services & Packages)**: Verify multi-tier package badges, duration chips, and delete confirmation dialog.

### 3.6 WhatsApp Templates (`/agent/templates`)
- **TC-TMP-01 (Live WhatsApp Preview)**: Open "Create Template". Type header, body text with `{{1}}`, `{{2}}` and watch the real-time WhatsApp chat bubble update dynamically.
- **TC-TMP-02 (Variable Validation)**: Ensure form enforces sample values for all dynamic placeholders before Meta Graph API submission.

### 3.7 Message Marketing (`/agent/broadcasts`)
- **TC-MM-01 (Multi-Channel Campaign Wizard)**:
  - **Step 1 (Audience & Channel)**: Select between WhatsApp and Normal SMS. Test audience segmentation (All, Customer Groups, Within 24h Active, Manual Selection).
  - **Step 2 (Composer & 24h Window)**:
    - WhatsApp Template: Select approved Meta template and fill parameter variables.
    - WhatsApp Free-Form Text: Attach promotional media poster (image/pdf) with caption. Verify automatic enforcement of 24h active customer window; customers outside 24h must be blocked and listed with clear warnings.
    - SMS Marketing: Input message with personalization tags (`{first_name}`, `{name}`, `{phone}`). Verify live segment counter toggles between GSM 7-bit (160 chars/part) and UCS-2 Unicode (70 chars/part).
  - **Step 3 (Summary & Credit Verification)**: Verify estimated cost and available balance displayed as whole numbers (`Rs. 30`, `Rs. 300`, `Rs. 100`). Verify insufficient credit blocking.
- **TC-MM-02 (Dual Credit System & Pricing Compliance)**:
  - WhatsApp Templates: Deducts Rs. 30.00 per message from `agents.credits`.
  - WhatsApp Free-Form Text within 24h: Free (Rs. 0.00), zero credits deducted.
  - Normal SMS: Deducts Rs. 1.00 per part from `agents.sms_credits`.
  - Agent Viewport Formatting: AI balance displayed with 1 decimal place (e.g. `$4.0 USD`); message credits displayed as whole numbers (e.g. `Rs. 300`, `Rs. 100`).
  - Message Marketing Page: Toolbar contains zero credit badges, presenting a clean operational search and action bar.
- **TC-MM-03 (Real-Time Automatic Progress & Live Balance Sync)**:
  - Launch an SMS or WhatsApp broadcast campaign.
  - Confirm the campaign row immediately enters `processing` status with live delivery progress bar.
  - Verify delivery progress (`sent_count`, `failed_count`, `status`) updates automatically in real time without refreshing or reloading the page (via `broadcast_updated` socket event + 2.5s active polling fallback).
  - Verify the Navbar liquidity pills (`Rs. 300 WA`, `Rs. 100 SMS`) deduct in real time via `credits_updated` / `sms_credits_updated` without page refresh.
- **TC-MM-04 (Bulk Actions & Retry Failed)**:
  - Select multiple campaigns via round checkboxes: verify floating bulk action bar displays selection count.
  - Execute bulk delete: verify confirmation modal with danger styling.
  - Click "Resend Failed" on a campaign with failed recipients: verify channel-aware credit verification and live retry status update.

### 3.8 Account Settings (`/agent/settings`)
- **TC-SET-01 (Inline Editable Fields)**: Edit Contact Name, Business Address, Business Email, Contact Phone, and Website. Verify Save/Cancel capsule pills.
- **TC-SET-02 (Branding & Company Overview)**: Test invoice background image upload + margin guide download. Test Company Overview direct text input, character counter (max 3,000 chars), saving, resetting, clearing, and AI chatbot knowledge grounding.
- **TC-SET-03 (Password Security)**: Change password with password visibility toggle and 8+ character validation.
- **TC-SET-04 (Team Management - Owner Only)**: Log in as agent owner. Add new team member via `rounded-3xl` modal. Delete member with confirm modal.

### 3.9 Performance Analytics (`/agent/analytics`)
- **TC-ANL-01 (Chartjs Visualizations)**: Verify Sales Overview (Doughnut), Revenue Updates (Bar), Yearly Orders (Line), and CRM Pipeline Funnel (Horizontal Bar).
- **TC-ANL-02 (Export Report)**: Click "Export Report" capsule button in top right. Verify browser print dialog triggers cleanly.

### 3.10 Conversations (`/agent/conversations`)
- **TC-CONV-01 (Empty Conversation Stability)**: Click on a conversation with 0 messages, or start a new conversation with a customer. Confirm the message view renders the centered "No messages yet" card with zero flickering, loop re-fetching, or skeleton fluttering.
- **TC-CONV-02 (Message View Scroll Stability)**: Scroll inside an empty or short chat history. Verify that `onLoadMoreMessages` does not fire prematurely when `scrollHeight <= clientHeight`.
- **TC-CONV-03 (Initial Message Delivery)**: Send a message in an empty conversation. Confirm immediate optimistic insertion and smooth scroll to bottom.
- **TC-CONV-04 (Empty Conversation List Ordering)**: Select an empty conversation from further down in the conversation list. Verify that selecting it does NOT change its timestamp to "Just now" and does NOT cause it to jump to the top of the conversation list.
- **TC-CONV-05 (Template View Layering)**: Open the Template Selection modal in Conversations. Click the View (Eye) icon on any template. Verify that the Template Preview modal opens in front of the selection modal (at `z-[110]`) with functional backdrop dismissal.

### 3.11 AI Chatbot Modular System Prompt & Token Optimization
- **TC-AI-01 (Inquiry Stage Token Pruning)**: Send a general inquiry (e.g. "What packages do you have?", "kohomada prices?"). Verify that the AI system prompt dynamically runs in `INQUIRY` mode, omitting Stage B invoice layouts, bank account details, and `[ACTION:CREATE_INVOICE]` schemas, saving ~650+ input tokens per message (~22% prompt size reduction).
- **TC-AI-02 (Confirmation Intent Stage Transition)**: Send an explicit confirmation message (e.g. "Startup package eka confirm karanna", "I want to buy", "send invoice", or reply "yes/ow/hari" after the bot asks to confirm). Verify that the system prompt dynamically activates `CONFIRMATION` mode, generating the formatted invoice, bank account details block, and appending `[ACTION:CREATE_INVOICE:...]`.
- **TC-AI-03 (Payment Slip / Paid Stage Transition)**: Send a payment receipt slip image or state "paid / salli damma". Verify that `PAID` mode activates, warmly acknowledging receipt and explaining manual verification by the team without re-generating invoices or repeating bank details.
- **TC-AI-04 (Appointment Booking Mode)**: Send an appointment inquiry (e.g. "Can I book a consultation call tomorrow?"). Verify that `APPOINTMENT` mode activates, including `[ACTION:CREATE_APPOINTMENT:...]` schema while omitting invoice generation schemas.

---

## 4. Page Layout, Spacing & Container Uniformity Verification

All agent pages now share the unified dashboard layout blueprint:
`className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans"`
and card/metric grids using `gap-3.5 sm:gap-4`.

| Page Route | Container Class Standard | Spacing Check |
| :--- | :--- | :--- |
| `/agent` (Dashboard) | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Benchmark |
| `/agent/customers` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Fixed crash (`DM` reference error), modularized |
| `/agent/invoices` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Standardized padding |
| `/agent/orders` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Standardized padding & metric grid gap |
| `/agent/orders/:id` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Standardized padding |
| `/agent/appointments` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Added outer padding & grid gap |
| `/agent/inventory` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Added outer padding & grid gap |
| `/agent/services` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Added outer padding & grid gap |
| `/agent/templates` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Added outer padding & grid gap |
| `/agent/broadcasts` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Normalized padding; removed top title; actions integrated in toolbar |
| `/agent/settings` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Normalized padding; removed redundant top title; direct 2-column grid |
| `/agent/analytics` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Normalized padding; removed top title; time ranges on left + Export on right |

---

## 5. AI Agent Multi-Tenant Isolation & Universal Business Context Test Criteria

- **TC-AI-01 (Multi-Tenant Prefix Isolation)**:
  - Verify that the AI agent queries only dynamic tables prefixed with the agent's validated prefix (`{agent_prefix}_*`).
  - Verify `validateAgentPrefix` strictly rejects any prefix containing non-alphanumeric/underscore characters to prevent SQL injection.
- **TC-AI-02 (Customer Database Context Scoping)**:
  - Inquire as a customer with existing appointments, invoices, or orders: verify the AI accurately answers status, date, and items based only on records in `{agent_prefix}_appointments`, `{agent_prefix}_orders_invoices`, and `{agent_prefix}_orders` for that `customer_id`.
  - Inquire about an order or invoice belonging to a different customer or agent: verify the AI agent reports no record found.
- **TC-AI-03 (Universal Business Phrasing - Zero Niche Trope Leakage)**:
  - Verify that stage B and stage C responses do not mention "project manager" or "gathering requirements", and instead use universal business phrasing.
  - Verify that prices are sourced dynamically from the agent's catalog without fallback to hardcoded arbitrary values (e.g. 5000).
- **TC-AI-04 (Product-Based Business Workflows & Stock Checking)**:
  - For businesses with `business_type = 'product'`:
    - Verify catalog items include Stock quantities and status (`In Stock`, `Low Stock`, `Out of Stock`).
    - Verify AI prompts the customer for delivery address and city when preparing orders.
    - When customer asks for product pictures/photos, verify product images from `{agent_prefix}_inventory_items` are dispatched with caption `*[Item Name]*`.
    - In Stage B and C, verify wording focuses on packing and courier dispatch rather than service requirements.
- **TC-AI-05 (AI Agent Custom Instructions & Business Rules Configuration)**:
  - Navigate to Settings -> AI Agent Instructions card.
  - Test viewing, editing, saving, and removing instructions. Verify changes persist to `agents.ai_instructions`.
  - In WhatsApp chat, verify the AI strictly respects custom business rules (e.g. delivery thresholds, no-COD policy, bulk discounts) over default prompts.
- **TC-AI-06 (AI-Driven WhatsApp Message Formatting & Safe Hygiene)**:
  - **Unbroken Sentence Integrity (Zero Regex Chops)**:
    - Verify sentences referencing past invoices (e.g., `මේකට අපි කලින් Invoice #INV-0283 එකත් එවලා තියෙනවා.`) stay 100% continuous and never split around the word `Invoice` or `#INV-`.
    - Verify ranges (e.g., `2 - 3 days`, `9:00 AM - 5:00 PM`, `Rs. 1,000 - 2,000`) never split onto multiple lines or convert into bullet points.
    - Verify ordinary sentences containing words like `item`, `service`, `product`, `invoice`, `bank` are never broken mid-phrase.
  - **AI-Prompt Generated Clean List Presentation**:
    - Verify catalog items, packages, and products are naturally formatted on their own lines with a clean bullet dot (`• `).
    - Verify an empty line (`\n\n`) is placed between the introductory sentence and the first item in the list.
    - Verify an empty line (`\n\n`) is placed between the last item in the list and the closing CTA/question.
    - Verify currency is cleanly formatted with comma thousands separators (e.g., `Rs. 15,000`).
  - **Safe Non-Destructive Hygiene (`sanitizeWhatsAppFormatting`)**:
    - Converts markdown `**bold**` or `***bold***` to WhatsApp `*bold*`.
    - Eliminates invalid inner spaces that break WhatsApp bolding (`* bold *` -> `*bold*`).
    - Strips emoji characters to maintain clean professional layout.
    - Collapses excessive newlines (maximum 2 consecutive newlines = 1 blank line).
  - **AI Formatter Utility (`formatMessageWithAI`)**:
    - Test calling `formatMessageWithAI(draftText, { apiKey })` with unformatted text.
    - Verify that output maintains 100% identical wording and numbers while laying out lines with bullets and bold headers.
    - Verify graceful fallback to `sanitizeWhatsAppFormatting` if API key is not present or network times out.
- **TC-AI-07 (Customer Language Preference Switching & Database Persistence)**:
  - **Non-Sinhala Detection & DB Update**:
    - Send an inbound message stating lack of Sinhala knowledge or requesting English (e.g., `"I don't know Sinhala, could you please speak in English?"` or `"Sinhala ba, English please"`).
    - Verify `detectAndApplyCustomerLanguageChange` detects `'english'`.
    - Query `{agent_prefix}_customers` and verify `language` column is updated to `'english'`.
  - **Immediate English Response**:
    - Verify the chatbot immediately replies 100% in English without using Sinhala greetings, Sinhala boilerplate, or Singlish.
    - Verify confirmation question is delivered in English (`"Would you like to confirm this order?..."`).
    - Verify delivery and invoice instructions are delivered in English.
  - **Subsequent Messages Retention**:
    - Send a follow-up message asking about items or products in plain text.
    - Verify the agent keeps replying in English without reverting to Sinhala, because the database profile is persisted as `'english'`.
  - **Action Tag Persistence (`[ACTION:UPDATE_LANGUAGE]`)**:
    - When the AI outputs `[ACTION:UPDATE_LANGUAGE:{"language":"english"}]`, verify `parseAndExecuteAgentActions` updates the database table and customer in-memory object.
- **TC-AI-08 (Dual-Stage AI Formatting Pipeline - Zero Regex Text Chopping)**:
  - **Stage 1 (Generation Layout Directives)**:
    - Primary system prompt in `ai-prompt-builder.ts` enforces unbroken continuous sentences, blank lines around lists, and language-tailored closing questions.
  - **Stage 2 (Post-Action AI Secondary Formatting Pass)**:
    - After action tags (`[ACTION:CREATE_INVOICE]`, etc.) are resolved and real numbers populated, the clean reply is passed through `formatMessageWithAI(cleanReply, { apiKey })`.
    - Verify DeepSeek AI formats WhatsApp markdown (`*bold*`, bullets `•`, paragraph spacing) with temperature `0.1` and zero wording modifications.
    - Verify sentences referencing invoices (e.g. `මේකට අපි කලින් Invoice #INV-0283 එකත් එවලා තියෙනවා.`) remain on a single unbroken line without being split by regex.
    - Verify graceful fallback to `sanitizeWhatsAppFormatting` when no API key is available or network request exceeds 15 seconds.
- **TC-AI-09 (Natural Sales Conversation, Proactive Lead Success & Service Pre-Payment Scoping)**:
  - **Natural Conversational Flow**:
    - Verify the chatbot conducts a natural, organic WhatsApp conversation without rapid-fire multiple questions or rigid checklist interrogation.
  - **Proactive Lead Success & Value Highlighting**:
    - When discussing offerings, verify the agent proactively describes the business (from Company Overview) and highlights special features, premium qualities, and standout benefits to convert leads into confirmed orders.
  - **Service Pre-Payment Boundaries**:
    - Inquire about a service (e.g. video editing, reels, consulting).
    - Verify the agent asks ONLY for package selection and quantity for the order/invoice.
    - Verify the agent NEVER interrogates the customer for creative briefs, video scripts, raw footage, or project work specifications before payment.
  - **Post-Payment Requirements Gathering Flow (Stage C)**:
    - Send a payment slip or message confirming payment.
    - Verify the AI informs the customer that the payment will be verified manually and that the team will reach out directly to gather all work requirements/project details and begin the work.
- **TC-AI-10 (Invoice & Bank Block Layout Spacing & Label Bolding)**:
  - **Stage B Generation Layout**:
    - When confirming an order, verify the AI generates the invoice message with empty blank lines (`\n\n`) separating:
      1. Intro greeting sentence and `*Invoice:*`.
      2. `*Total Amount:*` and `*Bank Details:*`.
      3. `*Branch:*` and the closing payment instructions paragraph.
  - **Label Bolding & Normalized Numbering**:
    - Verify all labels at line starts are bolded with single asterisks (`*Invoice:*`, `*Customer:*`, `*Item:*`, `*Unit Price:*`, `*Total Amount:*`, `*Bank Details:*`, `*Bank:*`, `*Account Name:*`, `*Account Number:*`, `*Branch:*`).
    - Verify invoice number includes the `#` prefix (`#INV-0287`).
  - **Zero Mid-Sentence Disruption**:
    - Verify running sentences containing words like `Invoice` or `#INV-` (e.g., `මේකට අපි කලින් Invoice #INV-0283 එකත් එවලා තියෙනවා.`) remain on a single unbroken line.
  - **AI Formatter API Key Propagation**:
    - Verify `generateCustomerReply` returns `apiKey` and passes it to `formatMessageWithAI` so secondary LLM formatting always executes with a valid key.
- **TC-AI-11 (Manual Invoice Paid / Advance Status Grounding & Anti-Duplication Rule)**:
  - **Context Status Badging**:
    - Verify `fetchCustomerInvoicesContext` stamps explicit flags:
      - `[PAID IN FULL - DO NOT RE-INVOICE OR RE-CHARGE FOR THESE ITEMS]` when `payment_status === 'paid'` or `advance_amount >= total_amount`.
      - `[ADVANCE PAID - Advance: Rs. X Paid, Remaining Due: Rs. Y]` when `payment_status === 'advance_paid'`.
      - `[UNPAID - Awaiting Payment]` when unpaid.
    - Verify `fetchCustomerOrdersContext` stamps `[PAID IN FULL - ALREADY CONFIRMED]` and `[ADVANCE PAID - Rs. X]`.
  - **System Prompt Rule 0.4 (Existing Invoices & Orders Grounding)**:
    - Customer requests additional items after previous invoices are paid/advance paid (e.g. "Mata twa video dekak ona").
    - Verify the AI treats new requests as completely separate, new orders/invoices.
    - Verify the AI does NOT recalculate past paid items, does NOT merge past items into multi-item package discounts, and does NOT re-charge or deduct from past settled amounts.
- **TC-AI-12 (Mandatory Bank Transfer Details & Fallback Safety Net)**:
  - **Dynamic Bank Details Extraction**:
    - Verify `extractBankDetails(companyOverview)` extracts Bank, Account Name, Account Number, and Branch accurately from business profile.
  - **Stage B Prompt Ingestion**:
    - Verify Stage B prompt includes the parsed bank details and explicitly instructs the model to include `*Bank Details:*` with Bank Name, Account Name, Account Number, and Branch in the invoice reply.
  - **Action Execution Fallback Safety Net**:
    - If the AI model generates an invoice creation action but fails to output the bank block in its text response, verify `executeCreateInvoice` in `ai-agent-actions.service.ts` automatically appends the bank details block and slip upload instructions before outbound delivery.
- **TC-AI-13 (Sinhala Orthography & Zero-Width Joiner Preservation)**:
  - **Zero-Width Joiner Preservation**:
    - Verify `formatMessageSpacingAndLineBreaks` does NOT strip `\u200D` (Zero-Width Joiner) when stripping zero-width spaces/marks (`[\u200B\u200E\u200F\uFEFF]`), ensuring Sinhala Yansaya (`ශ්‍ය`) and Rakaransaya (`ක්‍ර`) ligatures remain intact.
  - **Automatic Orthography Normalization**:
    - Verify `fixSinhalaOrthography` automatically repairs `අවශ්ය` (without ZWJ) to `අවශ්‍ය` (with Yansaya).
    - Verify missing ZWJs in Sha+Yansaya (`ශ් + ය` -> `ශ්‍ය`) and general Yansaya (`ක් + ය` -> `ක්‍ය`, `ව් + ය` -> `ව්‍ය`) and Rakaransaya (`ක් + ර` -> `ක්‍ර`, `ප් + ර` -> `ප්‍ර`) are converted to valid Unicode ligatures.
  - **Prompt & AI Formatter Guidelines**:
    - Verify `ai-prompt-builder.ts` instructs the LLM to write "අවශ්‍ය" and never "අවශ්ය".
    - Verify `formatMessageWithAI` includes spelling rule 8 requiring correct Sinhala orthography with Yansaya.
- **TC-AI-14 (DeepSeek-V3 Production Model, Token Ceiling Protection & Universal Fallback Safety Net)**:
  - **Model Standardization (`deepseek-chat`)**:
    - Verify that `callDeepSeekChat` and `formatMessageWithAI` use DeepSeek's official non-reasoning production chat model `deepseek-chat` (DeepSeek-V3) and reject or map any `deepseek-flash` alias.
    - Verify conversational latency drops from 25+ seconds to ~1.4 seconds with zero hidden `reasoning_tokens` overhead.
  - **Token Headroom (`max_tokens: 3500`)**:
    - Verify `max_tokens` is configured with ample headroom (3500 tokens) so replies are never truncated or returned empty.
  - **Auth Key Automatic System Fallback**:
    - If an agent's individual `customApiKey` fails with an authentication error (HTTP 401/403), verify `callDeepSeekChat` automatically falls back to `process.env.DEEPSEEK_API_KEY` to complete the customer's request seamlessly.
  - **Universal Stage-Aware Fallback Safety Net**:
    - If DeepSeek API returns empty content or an error (rate limit, connection drop), verify `generateCustomerReply` provides a polite, language-tailored fallback response (Sinhala or English) acknowledging the customer's message so the conversation is NEVER left in silence.
- **TC-AI-15 (Reliable Invoice Creation, Database Grounding, Affirmative Intent Recognition & PDF Dispatch)**:
  - **Affirmative & Invoice Request Stage Detection**:
    - Verify `detectConversationStage` classifies customer affirmatives (`Ha`, `Haa`, `ha danna`, `ow danna`, `okk`, `okey`, `හා`, `හ්ම්`, `හ්ම්ම්`) and invoice queries (`Ko invoice eka?`, `ko bill eka`, `where is the invoice?`, `send the invoice`, `කෝ ඉන්වොයිස්`, `කෝ බිල`) as `'confirmation'` stage.
  - **Permission in Stage A (Inquiry)**:
    - Verify that even if a conversation began in inquiry mode, when the customer explicitly agrees to proceed or asks for the bill, the model is permitted and instructed to generate the invoice and append `[ACTION:CREATE_INVOICE:...]`.
  - **Robust Fallback Invoice Creation & Direct Line Item Parsing**:
    - When the AI generates an invoice layout in text (e.g. `*Invoice:* #INV-0294` or `{{INVOICE_NUMBER}}`) without an action tag, verify `detectAndGenerateFallbackInvoice` automatically triggers and parses line items (`*Item:* [Name] (Qty: [N])`, `*Unit Price:* Rs. [Price]`, `*Total Amount:* Rs. [Total]`, or bullet points `• [Name] (Qty: [N]) - Rs. [Price]`) directly from `replyText`.
    - Enriches items and prices by querying tenant tables `${agent.agent_prefix}_services` / `${agent.agent_prefix}_service_packages` or `${agent.agent_prefix}_inventory_items`.
    - Inserts the real invoice into `${agent.agent_prefix}_orders_invoices` and items into `${agent.agent_prefix}_orders_items`.
  - **Hallucinated Invoice Number Reconciliation**:
    - Any hallucinated invoice number in text (e.g. `#INV-0294` or `INV0294`) is automatically reconciled with the actual database-generated invoice number (e.g. `#INV-0288`).
  - **PDF Attachment Dispatch & "Ko invoice eka?" Re-dispatch**:
    - Verify `dispatchCustomerInvoicePdf` dispatches the invoice PDF as an official WhatsApp document attachment whenever an invoice is created.
    - When a customer asks "Ko invoice eka?" or the AI promises "PDF එක පහළින් එවා ඇත" / "දැන් එවන්නම්", if no new invoice was created, `ai-chatbot.service.ts` queries the customer's most recent valid invoice from `${agent.agent_prefix}_orders_invoices` and dispatches the PDF immediately.
  - **Manual Verification Commands**:
    ```bash
    # Run test script for affirmative stage detection, fallback invoice generation, and number replacement
    npx tsx "C:\Users\thame\.gemini\antigravity-ide\brain\5e25760f-0663-4eec-a748-8c3c3c2c7fa2\scratch\test-invoice-fix.ts"

    # Typecheck backend
    cd backend && npx tsc --noEmit
    ```

- **TC-AI-16 (Autonomous Appointment Creation, Multi-Turn Context Persistence, Schema Verification & Real-Time Socket Updates)**:
  - **Multi-Turn Intent & Stage Detection**:
    - Verify `detectConversationStage` accurately classifies direct appointment requests in English (*"Can I book a consultation?"*), Singlish (*"Mata meeting ekak daganna puluwanda?"*), and Sinhala (*"හෙට උදේ 10ට මීටින් එකක් දාන්න පුලුවන්ද?"*).
    - Verify multi-turn conversational persistence: when the assistant asks for the customer's preferred date and time and the customer responds with temporal tokens (*"Tomorrow at 10 AM"*, *"Tuesday 3 PM"*, *"හෙට උදේ 10ට"*, *"heta ude 10ta"*), `detectConversationStage` maintains the `'appointment'` stage rather than falling back to `'inquiry'`.
  - **Stage D Workflow Instructions**:
    - Verify `buildStageWorkflowInstructions` serves dedicated `STAGE D: APPOINTMENT` instructions.
    - If date/time is not yet specified, verify the agent warmly requests preferred date and time without emitting action tags.
    - If date/time is specified, verify the agent confirms with `*Service:*`, `*Date:*`, and `*Time:*` and appends `[ACTION:CREATE_APPOINTMENT:{"title":"...","appointment_date":"...","duration_minutes":60,"notes":"..."}]`.
    - Verify the model NEVER outputs invoice tags, bank details, or order confirmation prompts during appointment booking.
  - **Table Schema Verification & Robust Colombo Timezone Date Parsing**:
    - Verify `ensureAppointmentTableSchema` creates or validates `{agent_prefix}_appointments` with columns `(customer_id, title, appointment_date, duration_minutes, status, notes, created_at, updated_at)`.
    - Verify `parseAppointmentDateTime` parses ISO strings, relative days (*"today"*, *"tomorrow"*, *"day after tomorrow"*, *"හෙට"*, *"අද"*, *"අනිද්දා"*, *"heta"*, *"ada"*), weekday names (*"monday"*–*"sunday"*, *"සඳුදා"*–*"ඉරිදා"*), and 12h/24h times anchored accurately to **Asia/Colombo (UTC+5:30)**.
  - **Fallback Appointment Generation**:
    - Verify `detectAndGenerateFallbackAppointment` automatically extracts details and inserts a record into `{agent_prefix}_appointments` if the LLM confirms the appointment in text but omits the action tag.
  - **Real-Time UI Socket Updates**:
    - Verify `emitAgentStatusUpdate` emits `appointment_created` to refresh the dashboard and appointment list in real time.
  - **Manual Verification Commands**:
    ```bash
    # Typecheck backend
    cd backend && npx tsc --noEmit
    ```

- **TC-AI-17 (Autonomous Invoice & Appointment Update, In-Place Record Mutation & PDF Regeneration)**:
  - **Confirmation Before Creation & Update**:
    - Verify that in Stage A (Inquiry), the AI confirms with the customer before generating an invoice or booking an appointment.
    - Verify that when the customer asks to change/update their order or reschedule an appointment, the AI warmly confirms the new details.
  - **In-Place Appointment Update (Zero Duplicates)**:
    - When an appointment reschedule intent is detected (e.g. *"Can we change the appointment to Friday 3 PM?"*, *"welaawa wenas karanna puluwanda?"*), verify that `executeUpdateAppointment` / `executeCreateAppointment` updates the single existing record in `{agent_prefix}_appointments` with the new timestamp and status, rather than inserting duplicate appointment rows.
  - **In-Place Invoice Update & PDF Regeneration**:
    - When an order quantity or item modification is requested (e.g. *"Actually make that 2 boxes instead"*, *"quantity eka 2k karanna"*), verify that `executeCreateInvoice` / `UPDATE_INVOICE` identifies the customer's active unpaid invoice (`status IN ('generated', 'sent')`) and invokes `updateInvoiceWithPdfRegeneration`.
    - Verify that line items in `{agent_prefix}_orders_items` are updated, the new total is stored in `{agent_prefix}_orders_invoices`, a fresh PDF is generated and uploaded to Cloudflare R2, and the previous obsolete PDF is removed from R2.

- **TC-AI-18 (Web UI Invoice Edit & PDF Regeneration with R2 Replacement)**:
  - **Edit Invoice Modal Launch**:
    - In `/invoices`, verify that clicking the Edit (`Pencil`) icon on an invoice opens `GenerateInvoiceModal` with the title "Edit Invoice", the target customer locked/preselected, and items/pricing/notes populated.
  - **Line Item Mutation & Total Recalculation**:
    - Verify adding, deleting, or altering line item quantities and unit prices dynamically updates subtotal, discount, advance, and total amount.
  - **Save & PDF Regeneration**:
    - On clicking "Update & Save Invoice", verify that a `PUT /manage-invoices` or `POST /upload-invoice` request is submitted with `id: invoiceId`.
    - Verify the backend updates `{agent_prefix}_orders_invoices` and line items, generates a new PDF, replaces `pdf_url`, and purges the old PDF key from Cloudflare R2.
- **TC-AI-19 (Accurate Invoice PDF Discount, Subtotal & Net Total Math Verification)**:
  - **Subtotal & Discount Derivation**:
    - Verify that when `discountPercentage > 0`, the generated PDF calculates the discount from the gross item subtotal (`subtotal * discountPercentage / 100`) rather than multiplying against the post-discount net amount (`totalAmount`).
    - Verify that both backend PDF generation (`backend/src/services/invoice-pdf.ts`) and frontend PDF generation (`frontend/src/components/agent/conversations/GenerateInvoiceModal/invoicePdfService.ts`) render an explicit `Subtotal:` line before the `Discount (-Rs. ...)` line.
  - **Single-Record Integrity & AI Action Flow**:
- **TC-AI-20 (Order Status Transition & Synchronization Verification)**:
  - **Status Value Whitelist & Case Normalization**:
    - Verify that `PUT /manage-orders` accepts all valid order workflow statuses: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `completed`, `cancelled`.
    - Verify that statuses sent with whitespace or mixed casing (e.g. `"Completed"`, `" Completed "`) are trimmed and lowercased before validation and database persistence.
  - **Orders Table & Details View Parity**:
    - In the Orders Table (`OrdersPage.tsx`), Order Details (`OrderDetailsPage.tsx`), and Bulk Actions Bar (`OrderBulkActionsBar.tsx`), verify that selecting `"Completed"` or any other valid status updates the order status successfully without returning `"Invalid order status"`.

- **TC-AI-21 (Customer Lead Stage Autonomous & Action-Driven Progression)**:
  - **New Lead to Contacted**:
    - For a customer with `lead_stage = 'New Lead'`, verify that when the AI agent responds to an inbound message or copilot trigger, `lead_stage` automatically transitions to `'Contacted'` in `{agent_prefix}_customers`.
  - **Inquiry to Interested**:
    - In Stage A (`inquiry`), verify that exploring packages or catalog items sets `interest_stage = 'Interested'`.
  - **Invoice Creation to Quotation Sent & Payment Pending**:
    - When `executeCreateInvoice` runs or `stage = 'confirmation'`, verify that `interest_stage` transitions to `'Quotation Sent'` and `conversion_stage` transitions to `'Payment Pending'` (unless already `'Paid'`).
  - **Explicit Action Execution (`[ACTION:UPDATE_LEAD_STAGE]`)**:
    - Verify that when the AI emits `[ACTION:UPDATE_LEAD_STAGE:{"lead_stage":"Contacted","interest_stage":"Interested"}]`, `parseAndExecuteAgentActions` validates the stages against database ENUMs and updates the database row.
    - Verify that the tag is completely stripped from the customer-facing WhatsApp reply via `sanitizeLeakedActionArtifacts`.
  - **Real-Time UI Socket Updates**:
    - Verify that `executeLeadStageUpdate` emits `lead_stage_updated` via `emitAgentStatusUpdate` and that `ConversationsPage.tsx` immediately updates the conversation badge in the left sidebar and `MessageView.tsx` header without requiring a page reload.

- **TC-AI-22 (Team Manual Verification & Authentic Paid Conversion Integrity Boundary)**:
  - **AI Agent Paid Boundary**:
    - In Stage C (`paid`), when a customer submits a payment slip image or claims they paid ("I paid", "salli damma"), verify that the AI agent acknowledges receipt and tells the customer that the team will verify manually shortly.
    - Verify that the AI agent does NOT mark `conversion_stage = 'Paid'`. The stage remains `'Payment Pending'`.
    - Verify that if the LLM attempts to output `[ACTION:UPDATE_LEAD_STAGE:{"conversion_stage":"Paid"}]`, `validateAndSanitizeLeadStageUpdate` intercepts and sanitizes it to `'Payment Pending'`.
  - **Team Manual Mark as Paid Conversion**:
    - In `OrdersPage.tsx` or `OrderDetailsPage.tsx`, click "Mark as fully paid" on an order.
    - Verify that `manage-orders.ts` updates the customer in `{agent_prefix}_customers` to `conversion_stage = 'Paid'` and `lead_stage = 'Contacted'`.
    - Verify that `ConversationsPage.tsx` badge turns green and displays "Paid" immediately.
  - **Non-Degradation Guardrail**:
- **TC-AI-23 (Customer Groups Management, Dynamic Retrieval & Broadcast Targeting)**:
  - **Default Lead Stage Groups Auto-Seeding & Synchronization**:
    - Verify that when an agent loads `/agent/customer-groups`, four default groups are automatically seeded: `New Lead` (`#3B82F6`), `Contacted` (`#8B5CF6`), `Follow-up Needed` (`#F59E0B`), and `Not Responding` (`#6B7280`), each tagged with `is_default = true` and displaying a `Lead Stage` badge.
    - Verify that all existing customers in the agent's CRM are automatically synced as members of the group corresponding to their current `lead_stage`.
    - Verify that creating a customer or updating a customer's `lead_stage` (via team edit or AI conversation progression) dynamically moves the customer to the new default group while preserving their custom group memberships.
    - Verify that default lead stage groups cannot be deleted (`DELETE` returns 400 with explanation) and their names cannot be modified in `EditGroupModal`.
  - **Group Creation & CRUD**:
    - Navigate to `/agent/customer-groups`. Click `+ New Group`. Enter Name, Description, pick Color, and optionally pre-select members. Submit and verify the card appears in the grid with avatar stacks and correct member count.
    - Edit group metadata (name, description, color) via `Edit` button and verify immediate updates.
    - Delete group via `Delete` button with confirmation modal and verify group is removed without deleting the underlying customers.
  - **Member Management Drawer**:
    - Click `View Members` on any group card to open `GroupMembersDrawer`.
    - Verify member search, individual removal (`Remove`), and adding existing customers via "+ Add Members".
  - **1-Click Phone Retrieval & Copy**:
    - Click `Copy Phones` on a group card. Verify all valid member phone numbers are formatted and copied to clipboard with toast notification.
  - **Customers Page & Bulk Actions Integration**:
    - In `/agent/customers`, verify the "Groups" button in toolbar Row 1 with group counter badge.
    - Select multiple customers via round checkboxes; in `CustomerBulkActionsBar`, click "Add to Group" and select target group. Verify members are linked and colored group pills appear under customer names in both desktop table and mobile cards.
    - In toolbar Row 2, filter by "All Groups" -> select a specific group. Verify table filters to only customers belonging to that group.
  - **Broadcast Campaign Targeting Integration**:
    - On `/agent/customer-groups`, click "Broadcast" on a group card. Verify navigation to `/agent/broadcasts` with `targetAudienceType = 'group'`, pre-selected group, and pre-populated campaign title.
    - In `CreateBroadcastModal` -> `AudienceStep`, verify "By Group" tab shows group dropdown with live member counts.

