# Biz Agentz — Multi-Tenant WhatsApp Business CRM

Biz Agentz is a modern, high-performance WhatsApp CRM and sales automation platform built for growing businesses. It connects directly with the official Meta WhatsApp Cloud API (Graph API v23.0) and provides business agents with a centralized hub to handle high-volume conversations, track sales pipelines, create orders, generate instant PDF invoices, schedule appointments, manage product and service catalogs, and integrate with autonomous AI chatbots.

---

## Architecture & Technology Stack

- **Frontend**: React 18, TypeScript 5, Vite 4, Tailwind CSS 3, Framer Motion, Socket.IO client v4, Chart.js, jsPDF.
- **Backend API**: Fastify 5, TypeScript 5 (Node.js ESM), Socket.IO server v4, JWT authentication (`jsonwebtoken`), Bcrypt password hashing.
- **Database**: PostgreSQL 15 via raw parameterized queries (`pg`), multi-tenant dynamic table isolation (`{prefix}_*`), Row-Level Security (RLS).
- **Cache**: Redis 7 via `ioredis` for conversational caching and unread message counters.
- **Object Storage**: Cloudflare R2 via `@aws-sdk/client-s3` for media attachments, images, and invoices.
- **Containerization**: Docker and Docker Compose.

---

## Documentation Hub

All detailed technical specifications, architectural blueprints, database schemas, style guidelines, and test cases reside in [`/docs`](docs/README.md):

1. **[Product Overview](docs/product.md)**: Product vision, user personas, brand personality, and design principles.
2. **[Product Architecture & System Structure](docs/product-structure.md)**: Complete system design, technology stack, module layout, API endpoints, and real-time events.
3. **[Database Architecture & Schema Specification](docs/database-architecture.md)**: Full PostgreSQL schema, multi-tenancy model, 13 dynamic tables, procedures, triggers, indexes, and migrations 001 through 039.
4. **[Design Foundations](docs/design.md)**: Visual theme, color scales, typography (Syne + DM Sans), spacing, and animation curves.
5. **[Component Style Guide](docs/style-guide.md)**: UI component tokens, buttons, forms, tables, modals, and viewport layout constraints.
6. **[SEO Architecture](docs/seo-architecture.md)**: Route indexing strategy, meta tags, OpenGraph, JSON-LD structured data, and Core Web Vitals.
7. **[Test Cases](docs/test-cases.md)**: Manual test execution suites, QA matrices, and runbooks.
8. **[Edge Functions Classification](docs/edge-functions-classification.md)**: Supabase edge functions to Fastify migration status.
9. **[Supabase REST Scan Report](docs/supabase-rest-scan-report.md)**: Direct REST call telemetry and migration tracking.

---

## Directory Structure

```
whatsbi/
├── backend/                  # Fastify 5 TypeScript API server
│   ├── src/
│   │   ├── routes/           # Modular Fastify route controllers
│   │   ├── utils/            # JWT, Redis cache, S3 helpers
│   │   └── server.ts         # Fastify application entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # React 18 + Vite SPA
│   ├── src/
│   │   ├── components/       # UI views, modals, and agent workspace
│   │   ├── hooks/            # Data-fetching and analytics hooks
│   │   ├── lib/              # API clients and PDF utilities
│   │   └── main.tsx          # Application router entry
│   ├── database/migrations/  # Sequential PostgreSQL migration SQL scripts (001-039)
│   └── package.json
├── docs/                     # Architectural, database, design, and testing specifications
├── plans/                    # Engineering plans and architectural RFCs
├── docker-compose.yml        # Multi-container orchestration (backend, frontend, postgres, redis)
└── CLAUDE.md                 # Agent operational rules and stack constraints
```

---

## Local Development Setup

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 15
- Redis 7
- Docker & Docker Compose (optional for containerized setup)

### 2. Environment Variables
Copy and configure environment variables in both `backend/.env` and `frontend/.env.local`:

```bash
# Backend (.env)
DATABASE_URL=postgres://user:password@localhost:5432/whatsbi
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
CHATBOT_SECRET=your-chatbot-secret
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token
R2_ACCESS_KEY_ID=your-r2-key
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_ACCOUNT_ID=your-r2-account-id
R2_BUCKET_NAME=whatsbi-media
R2_PUBLIC_URL=https://media.whatsbi.com

# Frontend (.env.local)
VITE_BACKEND_URL=http://localhost:8080
```

### 3. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Running with Docker Compose
```bash
docker-compose up --build
```