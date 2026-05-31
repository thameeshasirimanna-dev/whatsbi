# WhatsBi — Product Structure Document

## 1. Product Overview

**WhatsBi** is a multi-tenant WhatsApp Business CRM platform. It connects to the WhatsApp Cloud API (Meta Graph API) and gives each business agent a full dashboard to manage customer conversations, orders, invoices, appointments, inventory, services, and message templates — with an optional AI chatbot integration.

**Core value proposition:** Replace manual WhatsApp inbox management with a structured CRM that auto-ingests messages, tracks customer pipeline stages, and exposes a webhook for AI/chatbot automation.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Agent UI)                    │
│         React 18 + TypeScript + Vite + Tailwind         │
│                  Socket.IO Client (v4)                   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                 Backend API Server                       │
│          Fastify 5 + TypeScript (Node.js ESM)           │
│                  Socket.IO Server (v4)                   │
│               JWT Auth (jsonwebtoken)                    │
└────┬──────────┬────────────────────┬────────────────────┘
     │          │                    │
┌────▼────┐ ┌──▼──────┐   ┌─────────▼──────────┐
│PostgreSQL│ │  Redis  │   │  Cloudflare R2      │
│  (pg 15) │ │ (cache) │   │  (S3-compatible     │
│          │ │         │   │   media storage)    │
└──────────┘ └─────────┘   └────────────────────┘
```

**Deployment:** Docker Compose (4 services: backend, frontend/nginx, postgres, redis)

---

## 3. Technology Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript 5 |
| Build | Vite 4 |
| Styling | Tailwind CSS 3 |
| Routing | React Router DOM 7 |
| Animations | Framer Motion 10 |
| Icons | Heroicons 2, Lucide React |
| Charts | Chart.js 4 + react-chartjs-2 |
| PDF generation | jsPDF 3, pdf-lib |
| Real-time | socket.io-client 4 |
| UI components | @headlessui/react |
| Served by | nginx (Docker) |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js ESM |
| Framework | Fastify 5 |
| Language | TypeScript 5 |
| Database driver | pg (node-postgres) |
| Cache | ioredis 5 |
| Auth | jsonwebtoken 9 |
| Password hashing | bcrypt 6 |
| File uploads | @fastify/multipart |
| Object storage | @aws-sdk/client-s3 (Cloudflare R2) |
| Real-time | fastify-socket.io + socket.io 4 |
| Image processing | sharp |
| External API | WhatsApp Cloud API (Meta Graph API v23.0) |

### Infrastructure
| Component | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| Database | PostgreSQL 15 |
| Cache | Redis (alpine) |
| Media storage | Cloudflare R2 |
| Supabase (legacy) | Edge Functions (migrated to backend) |

---

## 4. Multi-Tenancy Model

Each **agent** (business user) gets their own isolated set of PostgreSQL tables, automatically created by a database trigger when the agent record is inserted.

**Naming convention:** `{agent_prefix}_{table_name}`

Example agent prefix `agt_6f78` creates:

```
agt_6f78_customers
agt_6f78_messages
agt_6f78_orders
agt_6f78_orders_items
agt_6f78_orders_invoices
agt_6f78_appointments
agt_6f78_templates
agt_6f78_categories
agt_6f78_inventory_items
agt_6f78_services
agt_6f78_service_packages
```

Row Level Security (RLS) is enabled on all tables. Policies enforce `user_id` ownership through the `agents` table.

---

## 5. Database Schema

### Global Tables

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| name | VARCHAR(255) | |
| email | VARCHAR(255) UNIQUE | |
| role | role enum | 'admin' or 'agent' |
| password_hash | TEXT | bcrypt |
| created_at | TIMESTAMPTZ | |

#### `agents`
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| agent_prefix | VARCHAR(20) UNIQUE | e.g. `agt_6f78` |
| user_id | UUID FK → users | Agent's login user |
| created_by | UUID FK → users | Admin who created it |
| name | TEXT | Display name |
| email | TEXT | Contact email |
| role | TEXT | 'agent' or 'admin' |
| business_type | TEXT | 'product' or 'service' |
| credits | INTEGER | AI message credits |
| invoice_template_path | TEXT | R2 key for PDF template |
| webhook_url | TEXT | External AI chatbot endpoint |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `whatsapp_configuration`
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| user_id | UUID FK → users UNIQUE | One config per user |
| whatsapp_number | VARCHAR(20) | |
| phone_number_id | VARCHAR(100) | Meta Phone Number ID |
| business_account_id | VARCHAR(100) | Meta WABA ID |
| api_key | TEXT | Meta access token |
| webhook_url | TEXT | This server's webhook URL |
| verify_token | TEXT | WhatsApp webhook verification |
| app_secret | TEXT | Meta app secret |
| is_active | BOOLEAN | |
| created_at / updated_at | TIMESTAMPTZ | |

### Dynamic Agent Tables (per-agent)

#### `{prefix}_customers`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| agent_id | BIGINT FK → agents | |
| name | TEXT | |
| phone | TEXT | WhatsApp number |
| profile_image_url | TEXT | |
| last_user_message_time | TIMESTAMPTZ | |
| ai_enabled | BOOLEAN | Enable chatbot for this customer |
| language | TEXT | Customer preferred language |
| lead_stage | lead_stage_enum | New Lead / Contacted / Not Responding / Follow-up Needed |
| interest_stage | interest_stage_enum | Interested / Quotation Sent / Asked for More Info |
| conversion_stage | conversion_stage_enum | Payment Pending / Paid / Order Confirmed |
| created_at | TIMESTAMPTZ | |

#### `{prefix}_messages`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| customer_id | INT FK → customers | |
| message | TEXT | |
| direction | VARCHAR | 'inbound' or 'outbound' |
| timestamp | TIMESTAMPTZ | |
| is_read | BOOLEAN | |
| media_type | media_type enum | none/image/video/audio/document/sticker |
| media_url | TEXT | R2 public URL |
| caption | TEXT | Media caption |

#### `{prefix}_orders`
| Column | Type |
|---|---|
| id | SERIAL PK |
| customer_id | INT FK |
| total_amount | DECIMAL(10,2) |
| status | VARCHAR (pending/processing/shipped/delivered/completed/cancelled) |
| notes | TEXT |
| shipping_address | TEXT |
| created_at / updated_at | TIMESTAMPTZ |

#### `{prefix}_orders_items`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| order_id | INT FK | |
| name | TEXT | Item name |
| quantity | INTEGER | ≥ 1 |
| price | NUMERIC | ≥ 0 |
| total | NUMERIC | Generated: quantity × price |

#### `{prefix}_orders_invoices`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| order_id | INT FK | |
| name | TEXT | Invoice name |
| pdf_url | TEXT | R2 URL |
| status | VARCHAR | generated/sent/paid |
| discount_percentage | DECIMAL(5,2) | 0–100 |
| generated_at / updated_at | TIMESTAMPTZ | |

#### `{prefix}_appointments`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| customer_id | INT FK | |
| title | TEXT | |
| appointment_date | TIMESTAMPTZ | |
| duration_minutes | INTEGER | 1–1440, default 30 |
| status | VARCHAR | pending/confirmed/completed/cancelled |
| notes | TEXT | |

#### `{prefix}_templates`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| agent_id | BIGINT FK | |
| name | VARCHAR(100) UNIQUE per agent | |
| category | message_category enum | |
| language | VARCHAR(10) | default 'en' |
| body | JSONB | Template body/components |
| is_active | BOOLEAN | |

#### `{prefix}_categories`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| name | TEXT UNIQUE | Alphanumeric, max 50 chars |
| description | TEXT | |
| color | VARCHAR(7) | Hex color |

#### `{prefix}_inventory_items`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| agent_id | BIGINT FK | |
| name | TEXT | |
| description | TEXT | |
| quantity | INTEGER ≥ 0 | |
| price | NUMERIC(10,2) ≥ 0 | |
| category_id | INT FK → categories | |
| sku | VARCHAR(100) | |
| image_urls | JSONB | Array of R2 URLs |

#### `{prefix}_services`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| agent_id | BIGINT FK | |
| service_name | VARCHAR UNIQUE per agent | |
| description | TEXT | |
| image_urls | JSONB | |
| is_active | BOOLEAN | |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### `{prefix}_service_packages`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| service_id | UUID FK → services | |
| package_name | VARCHAR UNIQUE per service | |
| price | DECIMAL(10,2) ≥ 0 | |
| currency | VARCHAR(10) | default 'USD' |
| discount | DECIMAL(5,2) | |
| description | TEXT | |
| is_active | BOOLEAN | |

### Enums
```sql
CREATE TYPE role AS ENUM ('admin', 'agent');
CREATE TYPE lead_stage_enum AS ENUM ('New Lead', 'Contacted', 'Not Responding', 'Follow-up Needed');
CREATE TYPE interest_stage_enum AS ENUM ('Interested', 'Quotation Sent', 'Asked for More Info');
CREATE TYPE conversion_stage_enum AS ENUM ('Payment Pending', 'Paid', 'Order Confirmed');
CREATE TYPE media_type AS ENUM ('none', 'image', 'video', 'audio', 'document', 'sticker');
CREATE TYPE message_category AS ENUM (...);
```

---

## 6. Backend API Routes

All routes require `Authorization: Bearer <JWT>` unless noted.

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/login` | Email/password login → JWT |
| POST | `/logout` | Invalidate session |
| GET | `/get-current-user` | Get authenticated user info |

### WhatsApp
| Method | Path | Description |
|---|---|---|
| GET/POST | `/whatsapp-webhook` | Meta webhook (no auth on GET) |
| GET | `/get-whatsapp-config` | Fetch agent's WhatsApp config |
| POST | `/setup-whatsapp-config` | First-time setup |
| PUT | `/update-whatsapp-config` | Update config |
| DELETE | `/delete-whatsapp-config` | Remove config |
| POST | `/send-whatsapp-message` | Send message to customer |
| GET | `/get-whatsapp-profile-pic` | Fetch contact profile picture |

### Agents (Admin only)
| Method | Path | Description |
|---|---|---|
| GET | `/get-agents` | List all agents |
| POST | `/add-agent` | Create agent + provision tables |
| PUT | `/update-agent` | Update agent |
| DELETE | `/delete-agent` | Delete agent + drop tables |
| GET | `/get-agent-profile` | Current agent's profile |
| PUT | `/update-agent-details` | Update agent name/type/etc |
| PUT | `/update-agent-template-path` | Set invoice template R2 path |
| POST | `/add-credits` | Add AI credits to agent |

### Admin
| Method | Path | Description |
|---|---|---|
| GET | `/get-admin-info` | Admin dashboard info |

### Users
| Method | Path | Description |
|---|---|---|
| GET | `/get-users` | List users |
| POST | `/add-user` | Create user |
| PUT | `/update-user` | Update user |
| DELETE | `/delete-user` | Delete user |
| PUT | `/update-password` | Change password |

### Conversations
| Method | Path | Description |
|---|---|---|
| GET | `/get-conversations` | List conversations (paginated, cached) |
| GET | `/get-conversation-messages` | Messages for a conversation |
| POST | `/mark-messages-read` | Mark messages as read |
| GET | `/authenticated-messages-stream` | SSE stream for new messages |

### Customers
| Method | Path | Description |
|---|---|---|
| GET | `/manage-customers` | List customers |
| POST | `/manage-customers` | Create customer |
| PUT | `/manage-customers` | Update customer |
| DELETE | `/manage-customers` | Delete customer |

### Orders
| Method | Path | Description |
|---|---|---|
| GET | `/manage-orders` | List orders |
| POST | `/manage-orders` | Create order with items |
| PUT | `/manage-orders` | Update order status |
| DELETE | `/manage-orders` | Delete order |

### Invoices
| Method | Path | Description |
|---|---|---|
| GET | `/manage-invoices` | List invoices |
| PUT | `/manage-invoices` | Update invoice status |
| DELETE | `/manage-invoices` | Delete invoice |
| POST | `/upload-invoice` | Upload PDF invoice to R2 |
| GET | `/download-invoice` | Download invoice PDF |
| GET | `/get-invoice-template` | Get agent's invoice template |
| POST | `/upload-invoice-template` | Upload invoice template to R2 |
| POST | `/send-invoice-template` | Send invoice via WhatsApp |

### Appointments
| Method | Path | Description |
|---|---|---|
| GET | `/manage-appointments` | List appointments |
| POST | `/manage-appointments` | Create appointment |
| PUT | `/manage-appointments` | Update appointment |
| DELETE | `/manage-appointments` | Delete appointment |

### Templates
| Method | Path | Description |
|---|---|---|
| GET | `/manage-templates` | List message templates |
| POST | `/manage-templates` | Create template |
| PUT | `/manage-templates` | Update template |
| DELETE | `/manage-templates` | Delete template |

### Inventory
| Method | Path | Description |
|---|---|---|
| GET | `/manage-inventory` | List inventory items |
| POST | `/manage-inventory` | Create item |
| PUT | `/manage-inventory` | Update item |
| DELETE | `/manage-inventory` | Delete item |
| POST | `/upload-inventory-images` | Upload item images to R2 |

### Services
| Method | Path | Description |
|---|---|---|
| GET | `/manage-services` | List services with packages |
| POST | `/manage-services` | Create service + packages |
| PUT | `/manage-services` | Update service |
| DELETE | `/manage-services` | Soft-delete service |
| POST | `/upload-service-images` | Upload service images to R2 |

### Analytics & Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/get-analytics` | Full analytics (12-month orders/revenue, statuses) |
| GET | `/get-dashboard-data` | Dashboard metrics + recent activity |

### Bot / Chatbot
| Method | Path | Description |
|---|---|---|
| GET | `/get-bot-context` | Get context data for AI chatbot |
| POST | `/chatbot-reply` | Send reply on behalf of AI chatbot (secret-authenticated) |

### Media
| Method | Path | Description |
|---|---|---|
| POST | `/upload-media` | Upload media file to R2 |
| GET | `/get-media-preview` | Proxy/preview media from R2 |

---

## 7. Frontend Structure

```
frontend/src/
├── main.tsx                          # App entry point
├── index.css                         # Global styles
├── vite-env.d.ts
├── types/
│   └── index.ts                      # Shared TypeScript types
├── lib/
│   ├── auth.ts                       # JWT token storage/retrieval
│   ├── agent.ts                      # Agent profile API calls
│   ├── api.ts                        # Orders, Invoices, Appointments, Customers API
│   └── invoice-pdf.ts                # Client-side PDF generation
├── hooks/
│   ├── useAnalytics.ts               # Analytics data hook
│   └── useAppointments.ts            # Appointments data hook
└── components/
    ├── LandingPage.tsx               # Public landing page
    ├── LoginPage.tsx                 # Login form
    ├── WhatsAppSetupModal.tsx        # WhatsApp config wizard
    ├── AddAgentModal.tsx             # Admin: create agent
    ├── EditAgentModal.tsx            # Admin: edit agent
    ├── AdminDashboard.tsx            # Admin panel (agent management)
    └── agent/
        ├── shared/
        │   ├── AgentRoutes.tsx       # React Router route config
        │   ├── AgentLayout.tsx       # Layout with sidebar + navbar
        │   ├── AgentAuthGuard.tsx    # Auth protection
        │   ├── Sidebar.tsx           # Navigation sidebar
        │   ├── Navbar.tsx            # Top navigation bar
        │   └── Loader.tsx            # Loading spinner
        ├── dashboard/
        │   └── AgentDashboard.tsx    # Metrics + recent activity
        ├── conversations/
        │   ├── ConversationsPage.tsx # Main conversation view
        │   ├── ConversationList.tsx  # Left panel: customer list
        │   ├── MessageView.tsx       # Right panel: messages
        │   ├── ContactDetails.tsx    # Customer info panel
        │   ├── AppointmentsTab.tsx   # Inline appointments
        │   ├── InvoicesTab.tsx       # Inline invoices
        │   ├── OrdersTab.tsx         # Inline orders
        │   ├── GenerateInvoiceModal.tsx
        │   ├── ProductSelectorModal.tsx
        │   ├── ServiceSelectorModal.tsx
        │   ├── CustomerOrdersModal.tsx
        │   └── LeadStageModal.tsx    # Update CRM stage
        ├── customers/
        │   ├── CustomersPage.tsx     # Customer list + CRM pipeline
        │   ├── CustomerAnalytics.tsx # Per-customer analytics
        │   └── CreateOrderModal.tsx
        ├── orders/
        │   ├── OrdersPage.tsx
        │   ├── OrderDetailsPage.tsx
        │   ├── EditOrderModal.tsx
        │   ├── ViewOrderModal.tsx
        │   └── OrderAnalytics.tsx
        ├── invoices/
        │   └── InvoicesPage.tsx
        ├── appointments/
        │   ├── AppointmentsPage.tsx
        │   ├── CreateAppointmentModal.tsx
        │   ├── EditAppointmentModal.tsx
        │   └── ViewAppointmentModal.tsx
        ├── inventory/
        │   └── InventoryPage.tsx
        ├── services/
        │   ├── ServicesPage.tsx
        │   ├── CreateServiceModal.tsx
        │   ├── EditServiceModal.tsx
        │   ├── DeleteServiceModal.tsx
        │   └── ViewServiceModal.tsx
        ├── templates/
        │   ├── TemplatesPage.tsx
        │   ├── CreateTemplateModal.tsx
        │   ├── ViewTemplateModal.tsx
        │   └── TemplatePreview.tsx
        ├── analytics/
        │   └── AnalyticsPage.tsx     # Charts: monthly orders/revenue
        └── settings/
            └── SettingsPage.tsx      # Agent settings + WhatsApp config
```

### Frontend Routes
```
/                     → LandingPage
/login                → LoginPage
/admin                → AdminDashboard
/agent/               → AgentDashboard
/agent/dashboard      → AgentDashboard
/agent/conversations  → ConversationsPage
/agent/customers      → CustomersPage
/agent/orders         → OrdersPage
/agent/orders/:id     → OrderDetailsPage
/agent/appointments   → AppointmentsPage
/agent/inventory      → InventoryPage
/agent/invoices       → InvoicesPage
/agent/templates      → TemplatesPage
/agent/services       → ServicesPage
/agent/analytics      → AnalyticsPage
/agent/settings       → SettingsPage
```

---

## 8. Backend Directory Structure

```
backend/src/
├── server.ts                          # App entry: registers all routes, Socket.IO, DB, Redis
├── utils/
│   ├── helpers.ts                     # JWT verify/generate, message processing, media download
│   ├── cache.ts                       # Redis CacheService (chat list, messages)
│   └── s3.ts                         # Cloudflare R2 upload/download/delete
└── routes/
    ├── admin/
    │   └── get-admin-info.ts
    ├── agents/
    │   ├── add-agent.ts
    │   ├── add-credits.ts
    │   ├── delete-agent.ts
    │   ├── get-agent-profile.ts
    │   ├── get-agents.ts
    │   ├── update-agent.ts
    │   ├── update-agent-details.ts
    │   └── update-agent-template-path.ts
    ├── analytics/
    │   └── get-analytics.ts
    ├── appointments/
    │   └── manage-appointments.ts
    ├── auth/
    │   ├── login.ts
    │   ├── logout.ts
    │   └── get-current-user.ts
    ├── bot/
    │   ├── chatbot-reply.ts           # AI chatbot send-reply endpoint
    │   └── get-bot-context.ts         # Context for AI agent
    ├── conversations/
    │   ├── authenticated-messages-stream.ts  # SSE stream
    │   ├── get-conversation-messages.ts
    │   ├── get-conversations.ts
    │   └── mark-messages-read.ts
    ├── customers/
    │   └── manage-customers.ts
    ├── dashboard/
    │   └── get-dashboard-data.ts
    ├── inventory/
    │   ├── manage-inventory.ts
    │   └── upload-inventory-images.ts
    ├── invoices/
    │   ├── download-invoice.ts
    │   ├── get-invoice-template.ts
    │   ├── manage-invoices.ts
    │   ├── send-invoice-template.ts
    │   └── upload-invoice.ts
    ├── media/
    │   ├── get-media-preview.ts
    │   └── upload-media.ts
    ├── orders/
    │   └── manage-orders.ts
    ├── services/
    │   ├── manage-services.ts
    │   └── upload-service-images.ts
    ├── templates/
    │   └── manage-templates.ts
    ├── upload-invoice-template.ts
    ├── users/
    │   ├── add-user.ts
    │   ├── delete-user.ts
    │   ├── get-users.ts
    │   ├── update-password.ts
    │   └── update-user.ts
    └── whatsapp/
        ├── delete-whatsapp-config.ts
        ├── get-whatsapp-config.ts
        ├── get-whatsapp-profile-pic.ts
        ├── send-whatsapp-message.ts
        ├── setup-whatsapp-config.ts
        ├── update-whatsapp-config.ts
        └── whatsapp-webhook.ts
```

---

## 9. Real-Time Architecture

**Socket.IO** (server: `fastify-socket.io`, client: `socket.io-client`)

### Connection flow
1. Frontend connects to Socket.IO server on backend
2. Frontend emits `join-agent-room` with `{ agentId, token }`
3. Backend adds socket to room `agent-{agentId}`

### Events emitted by server
| Event | Payload | Trigger |
|---|---|---|
| `new-message` | Message object | New inbound WhatsApp message received |
| `agent-status-update` | Status data | Credits changed, config updated |

### Redis Cache (CacheService)
- **Chat list cache** — `chat:list:{agentId}` — list of conversations with unread counts
- **Recent messages cache** — `messages:{agentId}:{customerId}` — last N messages per conversation
- Cache invalidated on new message arrival and mark-as-read

---

## 10. WhatsApp Integration Flow

```
Meta WhatsApp Cloud API
        │
        │ POST /whatsapp-webhook
        ▼
Backend webhook handler
        │
        ├─ Lookup whatsapp_configuration by phone_number_id
        ├─ Lookup agents by user_id
        ├─ Upsert customer in {prefix}_customers
        ├─ Download media → upload to R2 (if media message)
        ├─ Insert message in {prefix}_messages
        ├─ Invalidate Redis cache
        ├─ Emit Socket.IO "new-message" event
        └─ If customer.ai_enabled AND webhook_url set:
              POST to agent's webhook_url with JWT + message context
              (AI chatbot calls /chatbot-reply to respond)
```

### Message types handled
- `text` — plain text
- `image`, `video`, `audio`, `document` — media (downloaded + stored in R2)
- `sticker` — stored as `.webp`
- `button` / `interactive` — button replies
- All others — stored as `[TYPE] Unsupported message type`

---

## 11. Authentication & Authorization

### Auth flow
1. `POST /login` — verifies email + bcrypt password hash → returns JWT (24h expiry)
2. JWT payload: `{ sub: userId, iat, exp }`
3. All protected routes call `verifyJWT()` which:
   - Decodes JWT (no signature verification currently — uses DB user lookup as validation)
   - Queries `SELECT id, email, role FROM users WHERE id = $1`
   - Returns `{ id, email, role }`

### Roles
- **admin** — can manage agents, users, credits, global settings
- **agent** — accesses only their own data (enforced via agent_prefix lookup)

### Chatbot endpoint auth
- `POST /chatbot-reply` — authenticated by shared `CHATBOT_SECRET` env var (not JWT)

---

## 12. Media Storage (Cloudflare R2)

**Bucket structure:**
```
{agent_prefix}/
  incoming/    ← media received from WhatsApp customers
  outgoing/    ← media sent by agents
  invoices/    ← generated PDF invoices
  templates/   ← invoice PDF templates
  inventory/   ← product images
  services/    ← service images
```

**File naming:** `{timestamp}_{uuid}.{ext}`

**Access:** Public URLs via `R2_PUBLIC_URL/{key}`

---

## 13. CRM Pipeline Stages

Customers progress through three stage categories:

```
Lead Stage (always set)
├── New Lead
├── Contacted
├── Not Responding
└── Follow-up Needed

Interest Stage (optional)
├── Interested
├── Quotation Sent
└── Asked for More Info

Conversion Stage (optional)
├── Payment Pending
├── Paid
└── Order Confirmed
```

---

## 14. Business Types

Agents are configured as one of two business types:

| Type | Primary catalog | Order items source |
|---|---|---|
| `product` | Inventory (SKU-based items with stock) | Inventory items picker |
| `service` | Services + packages (tiered pricing) | Service package picker |

---

## 15. AI Chatbot Integration

Agents can enable AI automation per-customer. When `ai_enabled = true`:

1. Incoming message triggers POST to `whatsapp_configuration.webhook_url`
2. Payload includes: message data, customer context, JWT token, `agent_prefix`, `phone_number_id`
3. External AI service processes message and calls `POST /chatbot-reply` with `CHATBOT_SECRET`
4. Backend sends reply via WhatsApp API and stores outbound message

**`/get-bot-context`** — provides the AI with agent catalog data (inventory/services), customer history, templates, and agent configuration for context-aware replies.

---

## 16. Environment Variables

### Backend (`.env`)
```
DATABASE_URL=          # PostgreSQL connection string
REDIS_URL=             # Redis connection string
WHATSAPP_VERIFY_TOKEN= # Meta webhook verification token
R2_ACCESS_KEY_ID=      # Cloudflare R2 access key
R2_SECRET_ACCESS_KEY=  # Cloudflare R2 secret
R2_ACCOUNT_ID=         # Cloudflare account ID
R2_BUCKET_NAME=        # R2 bucket name
R2_PUBLIC_URL=         # Public base URL for R2
JWT_SECRET=            # Secret for signing JWTs
CHATBOT_SECRET=        # Shared secret for chatbot-reply endpoint
```

### Frontend (`.env.local`)
```
VITE_BACKEND_URL=       # Backend API base URL
VITE_SUPABASE_URL=      # Supabase project URL (legacy)
VITE_SUPABASE_ANON_KEY= # Supabase anon key (legacy)
VITE_SUPABASE_SERVICE_KEY= # Supabase service key (legacy)
```

---

## 17. Database Migrations

Located in `frontend/database/migrations/` — 28 sequential migrations covering:

| # | Change |
|---|---|
| 001 | Create whatsapp_configuration table |
| 002 | Add verify_token |
| 003 | Add total_amount to orders |
| 004 | Remove duplicate agents |
| 005 | Add is_read to messages |
| 006 | Add profile_image to customers |
| 007 | Add media support to messages |
| 008 | Fix timestamp timezone |
| 009 | Add messaging rules |
| 010 | Add WhatsApp templates |
| 011 | Add message_category enum |
| 012 | Replace base templates with dynamic |
| 013 | Add agent details columns |
| 014 | Fix agent table creation |
| 015 | Add invoice_template_path to agents |
| 016 | Add discount to invoices |
| 017 | Add inventory management tables |
| 018 | Update inventory image column |
| 019 | Add ai_enabled to customers |
| 019 | Add business_type to agents |
| 020 | Add services + service_packages |
| 021 | Create missing categories tables |
| 022 | Add language to customers |
| 022 | Update inventory category to ID |
| 023 | Add credits to agents |
| 023 | Add customer stages |
| 024 | Add customer stage enums |
| 024 | Update agent credits default |
| 025 | Add stages to existing customers |
| 026 | Fix get_appointments function |
| 027 | Add WhatsApp app_secret |
| 028 | Add password_hash to users |

---

## 18. Key Database Functions (PostgreSQL)

| Function | Purpose |
|---|---|
| `create_agent_tables(prefix, agent_id)` | Creates all 11 dynamic tables for a new agent |
| `drop_agent_tables(prefix)` | Drops all dynamic tables when agent is deleted |
| `trigger_create_agent_tables()` | Trigger: auto-runs on INSERT into agents |
| `update_updated_at_column()` | Generic trigger for updated_at timestamps |
| `add_credits(agent_id, amount)` | Atomic credits addition |
| `deduct_credits(agent_id, amount)` | Atomic credits deduction |
| `reset_monthly_credits()` | Scheduled monthly credits reset |
| `get_services_with_packages(prefix)` | Joins services + packages |
| `delete_service(prefix, service_id)` | Soft-delete with dependency check |

---

## 19. Docker Compose Services

```yaml
services:
  backend:   # Fastify API — port 3000:8080
  frontend:  # React/nginx — port 8080:80
  redis:     # Cache — internal
  postgres:  # Database — internal, persistent volume
```

---

## 20. Supabase Edge Functions (Legacy)

These exist in `frontend/supabase/functions/` and represent the original Supabase-hosted implementation. Most functionality has been migrated to the self-hosted backend. Still present for reference:

`add-agent`, `add-credits`, `authenticated-messages-stream`, `delete-agent`, `delete-invoice-template`, `delete-whatsapp-config`, `get-agents`, `get-analytics`, `get-media-preview`, `get-whatsapp-config`, `manage-appointments`, `manage-inventory`, `manage-services`, `messages-stream`, `send-invoice-template`, `send-product-images`, `send-whatsapp-message`, `setup-whatsapp-config`, `update-agent`, `upload-company-overview`, `upload-inventory-images`, `upload-invoice-template`, `upload-media-to-meta`, `upload-media`, `upload-service-images`, `whatsapp-webhook`

---

## 21. Analytics Data Points

The analytics endpoint aggregates:

- Total customers
- Total orders
- Total revenue (sum of `total_amount`)
- Pending orders count
- Completed orders count
- Total appointments
- Upcoming appointments
- Monthly orders (last 12 months)
- Monthly revenue (last 12 months)
- Order status distribution (pie chart data)

Dashboard endpoint aggregates:
- Active conversations (unread message threads)
- Total customers
- Orders today
- Average response time
- Recent activity (last conversations, orders, customers)
