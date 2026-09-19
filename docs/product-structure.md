# Biz Agentz — Product Architecture & System Structure

## 1. System Overview

**Biz Agentz** is a multi-tenant WhatsApp Business CRM and conversation automation platform. Built for direct integration with the Meta WhatsApp Cloud API (Graph API v23.0), Biz Agentz enables businesses to centralize customer communications, manage orders, generate PDF invoices, track appointments, organize product inventory or service tiers, and route messages to autonomous AI agents.

### Core Architecture Highlights
- **Tenant Isolation**: Dynamic per-agent PostgreSQL tables created on demand (`{prefix}_*`).
- **Real-Time Delivery**: Socket.IO v4 bi-directional event transport between backend and browser.
- **High-Performance Caching**: Redis CacheService caching chat lists, message history, and unread counters.
- **Media Ingestion**: Automated download of WhatsApp media and streaming storage into Cloudflare R2.
- **Native DeepSeek AI Chatbot**: Built-in autonomous conversation AI powered by DeepSeek (`deepseek-chat`), grounded in tenant inventory/service catalogs, company overview knowledge, and conversation memory.
- **Real-Time AI Dispatch**: Automated outbound messaging via Meta Cloud API v23.0 with instant Socket.IO agent inbox synchronization.
- **Unified Message Marketing**: Multi-channel marketing campaign engine supporting WhatsApp Marketing (Meta templates and free-form 24h messages with media posters) and Normal SMS Marketing (Text.lk v3 gateway with dynamic GSM/Unicode segmenting).
- **Dual Credit System**: Isolated accounting for WhatsApp Marketing (`credits`), SMS Marketing (`sms_credits`), and DeepSeek AI tokens (`ai_balance`).

---

## 2. System Topology

```
+-------------------------------------------------------------+
|                      Browser (Agent UI)                     |
|           React 18 + TypeScript + Vite + Tailwind           |
|                    Socket.IO Client (v4)                    |
+------------------------------+------------------------------+
                               | HTTPS / WebSocket
+------------------------------v------------------------------+
|                    Backend API Server                       |
|           Fastify 5 + TypeScript (Node.js ESM)              |
|                    Socket.IO Server (v4)                    |
|                 JWT Auth (jsonwebtoken)                     |
+------+-----------------------+-----------------------+------+
       |                       |                       |
+------v-----+          +------v------+         +------v------+
| PostgreSQL |          |    Redis    |         |  Cloudflare |
|   (pg 15)  |          |   (cache)   |         |      R2     |
+------------+          +-------------+         +-------------+
```

---

## 3. Technology Stack

### Frontend Application
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React | 18.0.0 | Single-page application UI |
| Language | TypeScript | 5.0.0 | Type safety |
| Build Tool | Vite | 4.4.0 | Development server and bundle compiler |
| Styling | Tailwind CSS | 3.3.0 | Utility-first styling framework |
| Routing | React Router DOM | 7.9.1 | Client-side navigation |
| Animation | Framer Motion | 10.18.0 | Micro-interactions and drawer reveals |
| Icons | Lucide React / Heroicons | 0.544.0 | Vector UI iconography (no emojis) |
| Charts | Chart.js & react-chartjs-2 | 4.5.1 | Revenue and order status analytics |
| PDF Engine | jsPDF & pdf-lib | 3.0.3 | Browser-side PDF invoice generation |
| Real-Time | socket.io-client | 4.8.1 | Live message updates and notifications |

### Backend API Server
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js (ESM) | 20+ | Execution engine |
| Framework | Fastify | 5.6.2 | High-throughput HTTP API |
| Language | TypeScript | 5.9.3 | Type safety |
| DB Driver | node-postgres (`pg`) | 8.16.3 | Raw parameterized SQL queries |
| Caching | ioredis | 5.8.2 | In-memory conversation & message caching |
| Auth | jsonwebtoken | 9.0.3 | Signed JWT bearer tokens |
| Encryption | bcrypt | 6.0.0 | Salted password hashing |
| File Uploads | @fastify/multipart | 9.0.1 | Streaming multipart file uploads |
| Storage | @aws-sdk/client-s3 | 3.956.0 | Cloudflare R2 bucket integration |
| Real-Time | fastify-socket.io | 5.1.0 | Event broadcasting to agent rooms |
| Image Processing| sharp | 0.34.5 | Thumbnail generation and WebP conversion |
| External API | Meta Graph API | v23.0 | WhatsApp Cloud API integration |
| External API | Text.lk v3 REST API | v3.0 | Direct GSM SMS Gateway delivery (Sri Lanka) |
| AI Model API | DeepSeek API | deepseek-chat | Native LLM inference for autonomous agent |

---

## 4. Multi-Tenancy Architecture

Each agent is assigned an alphanumeric prefix (e.g., `agt_a82f`). All entity tables for that agent are provisioned dynamically upon account creation.

### Dynamic Tables Provisioned per Agent
1. `{prefix}_customers`: Contact records, phone numbers, pipeline stages, language.
2. `{prefix}_messages`: Conversation history, media URLs, timestamps, read receipts.
3. `{prefix}_orders`: Customer orders, advance amounts, delivery dates, statuses.
4. `{prefix}_orders_items`: Line items linked to orders and/or invoices with generated totals.
5. `{prefix}_orders_invoices`: Customer invoice records, PDF paths in R2, discounts, advance amount, payment statuses, and link to resulting CRM order.
6. `{prefix}_appointments`: Customer appointment bookings and durations.
7. `{prefix}_templates`: Agent-specific WhatsApp message templates.
8. `{prefix}_categories`: Product categories for inventory organization.
9. `{prefix}_inventory_items`: Product stock, SKUs, pricing, R2 images.
10. `{prefix}_services`: Service catalog with soft deletion.
11. `{prefix}_service_packages`: Tiered pricing packages for services.
12. `{prefix}_broadcasts`: Outbound WhatsApp campaign records.
13. `{prefix}_broadcast_recipients`: Recipient status tracking for broadcasts.

---

## 5. Backend Route Map

All protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication & User Management
- `POST /login`: Validates user email and bcrypt password hash, issues JWT.
- `POST /logout`: Session termination.
- `GET /get-current-user`: Returns user profile, role, and agent affiliation.
- `GET /get-users`: Lists all users (Admin only).
- `POST /add-user`: Creates a user account (Admin only).
- `PUT /update-user`: Modifies user details (Admin only).
- `DELETE /delete-user`: Deactivates or removes a user (Admin only).
- `PUT /update-password`: Modifies current user password.

### WhatsApp Integration
- `GET /whatsapp-webhook`: Meta challenge-response verification handshake.
- `POST /whatsapp-webhook`: Ingests inbound WhatsApp messages, media, and status receipts.
- `GET /get-whatsapp-config`: Retrieves current agent's WhatsApp phone configuration.
- `POST /setup-whatsapp-config`: Initial configuration of Meta credentials.
- `PUT /update-whatsapp-config`: Modifies WABA ID, Phone Number ID, or access tokens.
- `DELETE /delete-whatsapp-config`: Removes active WhatsApp connection.
- `POST /send-whatsapp-message`: Dispatches outbound text, media, or template messages.
- `GET /get-whatsapp-profile-pic`: Fetches customer WhatsApp display picture.

### Agent Management (Admin)
- `GET /get-agents`: Lists all tenant agents and credit balances.
- `POST /add-agent`: Registers an agent and executes dynamic table provisioning.
- `PUT /update-agent`: Updates agent details.
- `DELETE /delete-agent`: Deprovisions agent and drops dynamic tables.
- `GET /get-agent-profile`: Fetches active agent profile.
- `PUT /update-agent-details`: Updates agent metadata.
- `PUT /update-agent-template-path`: Sets invoice PDF template R2 path.
- `POST /add-credits`: Credits additional funds to an agent account. Supports `balance_type`: `'whatsapp'` (WhatsApp marketing credits @ Rs. 30/msg), `'sms'` (Normal SMS credits @ Rs. 1/SMS), and `'ai'` (DeepSeek USD balance). Emits instant `credits_updated`, `sms_credits_updated`, or `ai_balance_updated` socket events.

### Conversations & Messaging
- `GET /get-conversations`: Lists conversations with cached unread counts.
- `GET /get-conversation-messages`: Fetches chronological chat history.
- `POST /mark-messages-read`: Updates message read receipts and cache.
- `GET /authenticated-messages-stream`: Server-Sent Events (SSE) fallback stream.

### Message Marketing & Campaigns
- `GET /manage-broadcasts`: Lists all marketing campaigns with live delivery metrics (`sent_count`, `failed_count`, `total_recipients`) and execution status (`pending`, `processing`, `completed`, `failed`).
- `GET /manage-broadcasts?action=details&broadcast_id=:id`: Returns granular recipient logs, dispatch timestamps, and delivery errors.
- `POST /manage-broadcasts`: Launches a multi-channel campaign:
  - **WhatsApp Marketing**: Meta template messages (`message_type: 'template'`, billed at Rs. 30.00/msg) or free-form text with media posters (`message_type: 'text'`, billed at Rs. 0.00 Free strictly within 24h customer window).
  - **Normal SMS Marketing**: Carrier SMS dispatch via Text.lk v3 REST Gateway (`channel: 'sms'`, billed at Rs. 1.00/SMS part) with automated GSM 7-bit vs UCS-2 Unicode parts calculation and personalization interpolation.
  - **Campaign Resend**: `POST /manage-broadcasts?action=resend` to retry failed recipients with automated credit verification.
- `DELETE /manage-broadcasts`: Permanently deletes single campaign (`id`) or bulk campaigns (`ids: number[]`).

### Business Entities
- `/manage-customers`: CRUD operations for CRM customer records, pipeline stages, and auto-syncing customer groups (e.g. `Within 24h Active`).
- `/manage-customer-groups`: CRUD operations for segmentation groups and group member assignments.
- `/manage-orders`: CRUD operations for orders and items.
- `/manage-invoices`: CRUD operations for invoices, PDF generation, and `POST /manage-invoices?action=create-order-from-invoice` (atomically marks invoice as paid and generates CRM order).
- `/upload-invoice`: Uploads generated PDF invoice and persists invoice items linked directly to the customer in the invoice-first lifecycle.
- `/manage-appointments`: CRUD operations for appointment bookings.
- `/manage-templates`: WhatsApp template management.
- `/manage-inventory`: Inventory items and category operations.
- `/manage-services`: Services and package management.
- `/upload-media`: Media upload to Cloudflare R2 bucket.
- `/get-media-preview`: Authenticated media preview proxy.

### Native AI Chatbot & Bot Gateway
- `POST /trigger-ai-response`: Authenticated trigger for on-demand DeepSeek AI responses (product inquiries, service inquiries, or custom prompts).
- `GET /bot-context/:customerId`: Aggregates customer history and catalog data for AI bots.
- `POST /chatbot-reply`: Allows authorized AI bots (`CHATBOT_SECRET`) or legacy integrations to dispatch replies.

### Real-Time Socket.IO Architecture
Rooms are partitioned by agent ID (`agent-${agentId}`).
- `new-message`: Outbound and inbound WhatsApp message synchronization.
- `agent-status-update` & `agent_status_update`: Real-time balance synchronization for `ai_balance_updated`, `credits_updated`, and `sms_credits_updated`.
- `broadcast_updated` & `broadcast-updated`: Live campaign telemetry emitting `broadcast_id`, `sent_count`, `failed_count`, `total_recipients`, and `status`. Frontend client couples this with an automated 2.5s polling loop during active processing.

---

## 6. Frontend Navigation & Module Layout

```
frontend/src/
├── main.tsx                         # App entry & router configuration
├── index.css                        # Global CSS, tokens, and font definitions
├── types/index.ts                   # TypeScript interfaces
├── lib/
│   ├── auth.ts                      # JWT storage and bearer header utilities
│   ├── agent.ts                     # Agent profile client functions
│   ├── api.ts                       # REST API client
│   └── invoice-pdf.ts               # jsPDF invoice rendering
├── hooks/
│   ├── useAnalytics.ts              # Analytics query hook
│   └── useAppointments.ts           # Appointments hook
└── components/
    ├── LandingPage.tsx              # Public presentation page
    ├── LoginPage.tsx                # Authentication form
    ├── AdminDashboard.tsx           # Admin management console
    ├── StyleGuidePage.tsx           # Live component catalog (/style-guide)
    └── agent/                       # Agent workspace modules
        ├── shared/
        │   ├── AgentLayout.tsx      # Sidebar + header layout
        │   ├── AgentRoutes.tsx      # Sub-route definitions
        │   └── AgentAuthGuard.tsx   # Protected route wrapper
        ├── conversations/           # Real-time chat & CRM drawers
        ├── customers/               # Customer lists & pipeline stages
        ├── orders/                  # Order entry and status tracking
        ├── invoices/                # PDF invoice generation
        ├── appointments/            # Booking calendar
        ├── inventory/               # Product catalog & stock
        ├── services/                # Service tiers & packages
        ├── broadcasts/              # Message Marketing (WhatsApp & SMS campaigns, wizard, poster upload)
        ├── templates/               # Message template editor
        ├── analytics/               # Revenue and conversion charts
        └── settings/                # WhatsApp/SMS API & account settings
```

---

## 7. Cloudflare R2 Media Structure

All media assets are stored in Cloudflare R2 using AWS S3 SDK v3:

```
{agent_prefix}/
├── incoming/       # Customer-sent images, documents, voice notes
├── outgoing/       # Agent-sent media attachments
├── invoices/       # Rendered PDF customer invoices
├── templates/      # Base PDF letterhead templates
├── inventory/      # Product catalog images (WebP format)
└── services/       # Service catalog images (WebP format)
```

Object keys follow the convention: `{timestamp}_{uuid}.{ext}`.
