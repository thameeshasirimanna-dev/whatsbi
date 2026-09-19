# Biz Agentz — Product Overview

## 1. Product Register
- **Product Name**: Biz Agentz
- **Product Type**: Multi-Tenant WhatsApp Business CRM & Automation Suite
- **Target Audience**: Business owners, sales agents, customer support teams, and administrators managing customer communications over WhatsApp.

---

## 2. Target Users & Personas

### Business Agents
Frontline sales and customer success operators using Biz Agentz for high-volume, real-time customer conversations.
- **Key Workflows**:
  - Live conversation management and chat filtering.
  - Sending WhatsApp message templates and media assets.
  - Converting chats into orders, quotes, and appointments directly from the conversation panel.
  - Toggling AI chatbot support per customer.
  - Updating lead stages (`New Lead`, `Contacted`, `Follow-up Needed`).

### Administrators
Business managers overseeing team performance, agent allocations, and channel configurations.
- **Key Workflows**:
  - Provisioning and configuring agents with isolated tenant databases.
  - Managing Meta WhatsApp Cloud API credentials (Phone Number ID, WABA ID, Verify Token, App Secret).
  - Allocation and monitoring of AI message credits.
  - System-wide revenue, order, and conversation analytics.

---

## 3. Product Purpose & Value Proposition

Biz Agentz transforms chaotic WhatsApp chat threads into a structured, revenue-generating CRM. It connects natively to the official WhatsApp Cloud API (Meta Graph API v23.0) and replaces manual inboxes with:
1. **Automated Message Ingestion**: Reliable webhook ingestion into tenant-isolated PostgreSQL tables with Redis caching.
2. **End-to-End Sales Pipeline**: Order management, automated PDF invoice generation, and customer stage tracking directly embedded in conversation threads.
3. **Dual Business Operating Modes**:
   - **Product Businesses**: SKU inventory management, stock tracking, and item selection.
   - **Service Businesses**: Tiered service package catalogs and appointment booking.
4. **Native DeepSeek AI Chatbot**: Built-in, context-aware AI chatbot powered by DeepSeek (`deepseek-chat`) that automatically responds to customer inquiries using real catalog items, prices, and business policies without external webhook friction, while preserving seamless human agent escalation.
5. **Unified Message Marketing Suite**:
   - **WhatsApp Marketing**: Dispatches Meta-approved templates (Rs. 30.00/msg outside 24h window) or free-form text with promotional posters/media attachments (Rs. 0.00 Free within 24h window). Automatically isolates and blocks non-24h active customers when free-form text is selected.
   - **SMS Marketing**: Direct GSM carrier delivery via Text.lk v3 REST Gateway (Rs. 1.00/SMS part) with automated GSM 7-bit / UCS-2 Unicode segment calculation and template personalization tags (`{first_name}`, `{name}`, `{phone}`, etc.).
6. **Dual Credit & Provisioning System**:
   - Dedicated balances for WhatsApp Marketing (`credits`), SMS Marketing (`sms_credits`), and DeepSeek AI (`ai_balance`).
   - Initial agent provisioning: **300 WhatsApp Credits** (10 template messages @ Rs. 30), **100 SMS Credits** (100 SMS @ Rs. 1), and **$4.00 USD** DeepSeek AI token balance.
   - Real-time automatic delivery telemetry and live credit synchronization via Socket.IO.

---

## 4. Brand Personality

- **Professional**: Clean, purposeful, and structured; built for daily operational workflows.
- **Streamlined**: Minimal latency, rapid micro-interactions, high information density.
- **Trustworthy**: Strict multi-tenant isolation, transparent credit accounting, dependable message delivery.

---

## 5. Anti-References & Design Guardrails

- **No Over-Decorated Minimalism**: Avoid low-contrast beige/cream tones, ghost cards with ambiguous borders, or massive blurred drop shadows that degrade clarity.
- **No Playful/Bouncy Distractions**: Interface micro-interactions must communicate state and speed, not superficial decoration. No bouncy or elastic animations.
- **No Blocking Full-Page Spinners**: Prefer optimistic UI updates, skeleton shimmers, and non-blocking background synchronization.
- **No Emoji Icons**: All icons must use scalable vector SVGs (Heroicons, Lucide React). No native emoji icons anywhere in the user interface.

---

## 6. Core Design Principles

1. **Speed & Efficiency**: Every agent action must feel immediate. Messages render optimistically, keyboard shortcuts accelerate navigation, and caching minimizes round-trips.
2. **Clear Information Architecture**: Precise visual hierarchy dividing navigation, conversation lists, active conversation panes, and customer contextual widgets.
3. **Task-Focused Micro-Interactions**: Visual cues communicate state transitions (active tabs, dropdown toggles, modal alerts, sending indicators).
4. **Responsive Layout Discipline**:
   - Desktop viewports: Interface constrained within `90vw` maximum width, ensuring balanced layout on large monitors.
   - Mobile and tablet viewports: Interface constrained within `95vw` maximum width.
   - Fluid typography responsive to all display sizes.

---

## 7. Accessibility & Inclusivity

- **Contrast Ratios**: All text and interactive elements meet or exceed WCAG AA standards (minimum 4.5:1 for body copy).
- **Reduced Motion**: All CSS animations respect `prefers-reduced-motion: reduce`.
- **Keyboard Navigation**: Focus outlines, logical tab sequences, and ARIA labels on all modal and interactive components.
- **Asset Standards**: All image assets served in modern WebP format for fast delivery and minimal bandwidth consumption.
