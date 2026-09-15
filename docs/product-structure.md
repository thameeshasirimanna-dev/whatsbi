# WhatsBi — Product Architecture & System Structure

## 1. System Overview

**WhatsBi** is a multi-tenant WhatsApp Business CRM and conversation automation platform. Built for direct integration with the Meta WhatsApp Cloud API (Graph API v23.0), WhatsBi enables businesses to centralize customer communications, manage orders, generate PDF invoices, track appointments, organize product inventory or service tiers, and route messages to autonomous AI agents.

### Core Architecture Highlights
- **Tenant Isolation**: Dynamic per-agent PostgreSQL tables created on demand (`{prefix}_*`).
- **Real-Time Delivery**: Socket.IO v4 bi-directional event transport between backend and browser.
- **High-Performance Caching**: Redis CacheService caching chat lists, message history, and unread counters.
- **Media Ingestion**: Automated download of WhatsApp media and streaming storage into Cloudflare R2.
- **External Bot Integration**: Dedicated webhook handoff enabling third-party AI assistants to read conversation history and dispatch replies.

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

---

## 4. Multi-Tenancy Architecture

Each agent is assigned an alphanumeric prefix (e.g., `agt_a82f`). All entity tables for that agent are provisioned dynamically upon account creation.

### Dynamic Tables Provisioned per Agent
1. `{prefix}_customers`: Contact records, phone numbers, pipeline stages, language.
2. `{prefix}_messages`: Conversation history, media URLs, timestamps, read receipts.
3. `{prefix}_orders`: Customer orders, advance amounts, delivery dates, statuses.
4. `{prefix}_orders_items`: Order line items with generated totals.
5. `{prefix}_orders_invoices`: Invoice PDFs stored in R2, discounts, statuses.
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
- `POST /add-credits`: Credits additional AI message tokens to an agent.

### Conversations & Messaging
- `GET /get-conversations`: Lists conversations with cached unread counts.
- `GET /get-conversation-messages`: Fetches chronological chat history.
- `POST /mark-messages-read`: Updates message read receipts and cache.
- `GET /authenticated-messages-stream`: Server-Sent Events (SSE) fallback stream.

### Business Entities
- `/manage-customers`: CRUD operations for CRM customer records.
- `/manage-orders`: CRUD operations for orders and items.
- `/manage-invoices`: CRUD operations for invoices and PDF generation.
- `/manage-appointments`: CRUD operations for appointment bookings.
- `/manage-templates`: WhatsApp template management.
- `/manage-inventory`: Inventory items and category operations.
- `/manage-services`: Services and package management.
- `/upload-media`: Media upload to Cloudflare R2 bucket.
- `/get-media-preview`: Authenticated media preview proxy.

### Autonomous Bot Gateway
- `GET /get-bot-context`: Aggregates customer history and catalog data for AI bots.
- `POST /chatbot-reply`: Allows authorized AI bots (`CHATBOT_SECRET`) to dispatch replies.

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
        ├── templates/               # Message template editor
        ├── analytics/               # Revenue and conversion charts
        └── settings/                # WhatsApp API & account settings
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
