# WhatsBi Test Cases & Quality Assurance Specification

This document provides the complete test case catalog for WhatsBi. In accordance with project operational rules, **all test cases must be executed manually by engineers**; they are never executed automatically by the AI assistant.

---

## 1. Test Execution Protocol & Guidelines

### Rules of Engagement
1. **Manual Execution Only**: Tests must be triggered manually using curl, Postman, or local browser sessions.
2. **Credential Safety**: Never hardcode real API keys or tokens in test scripts or logs. Always source credentials from local `.env` files.
3. **Tenant Isolation Verification**: Whenever database tests are executed, verify that tenant data does not leak across table prefixes.
4. **Clean-up Post Testing**: Test agents created during manual test runs must be deprovisioned to clean up dynamically allocated tables.

---

## 2. Backend Test Suites

### Suite 1: Authentication & Access Control (TC-AUTH)

#### TC-AUTH-01: Administrator Login
- **Objective**: Verify that an administrator can authenticate with valid credentials and receive a signed JWT.
- **Preconditions**: User exists with `role = 'admin'` and known password.
- **Manual Step**:
  ```bash
  curl -X POST http://localhost:8080/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@whatsbi.local", "password": "YourSecurePassword"}'
  ```
- **Expected Outcome**: HTTP 200, response body contains `token` and user object with `role: "admin"`.

#### TC-AUTH-02: Agent Login
- **Objective**: Verify that an agent user authenticates and receives agent profile metadata.
- **Preconditions**: User exists with `role = 'agent'` and assigned `agent_id`.
- **Manual Step**:
  ```bash
  curl -X POST http://localhost:8080/login \
    -H "Content-Type: application/json" \
    -d '{"email": "agent@whatsbi.local", "password": "AgentPassword"}'
  ```
- **Expected Outcome**: HTTP 200, response body contains `token`, `role: "agent"`, and `agent_prefix`.

#### TC-AUTH-03: Login Rejection on Invalid Password
- **Objective**: Ensure incorrect credentials return 401 without revealing account existence.
- **Manual Step**:
  ```bash
  curl -X POST http://localhost:8080/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@whatsbi.local", "password": "WrongPassword123"}'
  ```
- **Expected Outcome**: HTTP 401 Unauthorized with generic error message.

#### TC-AUTH-04: Protected Route Access Without Token
- **Objective**: Ensure protected endpoints block requests lacking a Bearer token.
- **Manual Step**:
  ```bash
  curl -X GET http://localhost:8080/get-current-user
  ```
- **Expected Outcome**: HTTP 401 Unauthorized.

#### TC-AUTH-05: Agent Privilege Escalation Prevention
- **Objective**: Ensure an agent user cannot access admin-only endpoints.
- **Manual Step**:
  ```bash
  curl -X GET http://localhost:8080/get-agents \
    -H "Authorization: Bearer <AGENT_JWT_TOKEN>"
  ```
- **Expected Outcome**: HTTP 403 Forbidden.

---

### Suite 2: Multi-Tenancy & Dynamic Table Lifecycle (TC-TENANT)

#### TC-TENANT-01: Automatic Dynamic Table Creation on Agent Insert
- **Objective**: Verify that adding an agent provisions all 13 dynamic tables.
- **Manual Step**:
  1. Call `POST /add-agent` with valid admin token.
  2. Inspect PostgreSQL schema:
     ```sql
     SELECT tablename FROM pg_tables WHERE tablename LIKE 'agt_test1_%';
     ```
- **Expected Outcome**: All 13 tables are present:
  - `agt_test1_customers`
  - `agt_test1_messages`
  - `agt_test1_orders`
  - `agt_test1_orders_items`
  - `agt_test1_orders_invoices`
  - `agt_test1_appointments`
  - `agt_test1_templates`
  - `agt_test1_categories`
  - `agt_test1_inventory_items`
  - `agt_test1_services`
  - `agt_test1_service_packages`
  - `agt_test1_broadcasts`
  - `agt_test1_broadcast_recipients`

#### TC-TENANT-02: Tenant Cross-Query Isolation
- **Objective**: Verify that Agent A cannot access Agent B's customer records.
- **Manual Step**: Query `/manage-customers` using Agent A's token. Attempt to fetch an ID belonging to Agent B.
- **Expected Outcome**: Query returns only Agent A's customers; Agent B's ID yields HTTP 404.

#### TC-TENANT-03: Dynamic Table Deletion on Deprovisioning
- **Objective**: Verify that calling `DELETE /delete-agent` cleanly drops all associated dynamic tables.
- **Manual Step**: Execute `DELETE /delete-agent` and verify `SELECT tablename FROM pg_tables WHERE tablename LIKE 'agt_test1_%';` returns zero rows.
- **Expected Outcome**: All tables dropped without foreign key deadlock.

#### TC-TENANT-04: Atomic Credit Deduction
- **Objective**: Verify that `deduct_credits` decrements balance safely without negative balance underflow.
- **Manual Step**: Call stored function `SELECT deduct_credits(<AGENT_ID>, 1);` when balance is 0.
- **Expected Outcome**: Function returns `false` and balance remains 0.

---

### Suite 3: WhatsApp Webhook & Messaging (TC-WA)

#### TC-WA-01: Meta Webhook GET Challenge Handshake
- **Objective**: Verify Meta webhook verification response.
- **Manual Step**:
  ```bash
  curl -X GET "http://localhost:8080/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING"
  ```
- **Expected Outcome**: HTTP 200 with exact body `CHALLENGE_STRING`.

#### TC-WA-02: Inbound Message Processing
- **Objective**: Ingest an inbound text message payload from Meta.
- **Manual Step**:
  ```bash
  curl -X POST http://localhost:8080/whatsapp-webhook \
    -H "Content-Type: application/json" \
    -d '{
      "entry": [{
        "changes": [{
          "value": {
            "metadata": {"phone_number_id": "TEST_PHONE_ID"},
            "contacts": [{"wa_id": "15551234567", "profile": {"name": "Test Customer"}}],
            "messages": [{
              "id": "wamid.test1234",
              "from": "15551234567",
              "type": "text",
              "text": {"body": "Hello WhatsBi test"},
              "timestamp": "1700000000"
            }]
          }
        }]
      }]
    }'
  ```
- **Expected Outcome**: HTTP 200, customer record inserted or updated in `{prefix}_customers`, message recorded in `{prefix}_messages`, and Socket.IO `new-message` event broadcast.

#### TC-WA-03: AI Chatbot Reply Endpoint
- **Objective**: Verify that external AI bots can send replies using `CHATBOT_SECRET`.
- **Manual Step**:
  ```bash
  curl -X POST http://localhost:8080/chatbot-reply \
    -H "Content-Type: application/json" \
    -H "x-chatbot-secret: YOUR_CHATBOT_SECRET" \
    -d '{
      "agentPrefix": "agt_test1",
      "customerId": 1,
      "message": "Automated AI reply test"
    }'
  ```
- **Expected Outcome**: Outbound message dispatched to WhatsApp API and stored in `{prefix}_messages`.

---

### Suite 4: CRM Entity Management (TC-CRM)

#### TC-CRM-01: Customer Phone Uniqueness
- **Objective**: Verify that adding a customer with an existing phone number for the same agent fails gracefully.
- **Manual Step**: Send `POST /manage-customers` with an identical phone number.
- **Expected Outcome**: Error response indicating duplicate phone constraint.

#### TC-CRM-02: Order Creation with Advance Payment
- **Objective**: Verify order creation with line items, total calculation, and advance amount.
- **Manual Step**: Send `POST /manage-orders` with customer ID, items array, and `advance_amount`.
- **Expected Outcome**: Order created in `{prefix}_orders` with matching items in `{prefix}_orders_items`.

#### TC-CRM-03: PDF Invoice Storage in Cloudflare R2
- **Objective**: Ensure generated invoices upload to the correct `{agent_prefix}/invoices/` path in R2.
- **Manual Step**: Trigger `POST /upload-invoice` with PDF blob.
- **Expected Outcome**: Response contains public R2 URL, invoice record saved in `{prefix}_orders_invoices`.

---

## 3. Frontend Test Suites

### Suite 5: Viewport Constraints & Responsive Layout (TC-FE-RESP)

#### TC-FE-RESP-01: Desktop Viewport Max Width Constraint
- **Objective**: Ensure layout width does not exceed 90vw on desktop screens.
- **Manual Step**:
  1. Open browser on a desktop display (`width >= 1280px`).
  2. Inspect main container element via DevTools.
  3. Verify computed style `max-width` is `<= 90vw`.
- **Expected Outcome**: All content stays bounded within 90% of screen width with balanced gutters.

#### TC-FE-RESP-02: Mobile & Tablet Viewport Max Width Constraint
- **Objective**: Ensure layout width does not exceed 95vw on mobile/tablet viewports.
- **Manual Step**:
  1. Toggle mobile responsive mode (`width <= 768px`).
  2. Inspect container elements.
  3. Verify computed style `max-width` is `<= 95vw`.
- **Expected Outcome**: Adequate margin gutters preserved without horizontal clipping.

#### TC-FE-RESP-03: Responsive Typography
- **Objective**: Ensure headers and body text scale smoothly between 320px and 2560px screen widths.
- **Manual Step**: Resize browser viewport continuously from 320px to 2560px.
- **Expected Outcome**: Typography scales smoothly with `clamp()` rules without text overlap or truncation.

---

### Suite 6: Style & Visual Compliance (TC-FE-STYLE)

#### TC-FE-STYLE-01: Zero Emoji Icons Compliance
- **Objective**: Verify no native Unicode emojis are used as UI icons, badges, or list markers.
- **Manual Step**: Scan all screens (`/`, `/login`, `/admin/dashboard`, `/style-guide`, `/agent/*`).
- **Expected Outcome**: All visual icons are SVG vector components (`lucide-react` or `@heroicons/react`).

#### TC-FE-STYLE-02: No Pill Tags for Titles
- **Objective**: Verify that headings and titles are not rendered inside pill tags or chip wrappers.
- **Manual Step**: Inspect page headings, card titles, and modal headers.
- **Expected Outcome**: Titles use clean display typography (`Syne`) without pill tag borders.

#### TC-FE-STYLE-03: WebP Asset Format Compliance
- **Objective**: Verify that all image assets are served in `.webp` format.
- **Manual Step**: Inspect Network tab in DevTools for all `image/*` requests.
- **Expected Outcome**: All image MIME types are `image/webp` or `.webp` file extensions.

---

## 4. Manual Test Run Reporting Template

When executing manual test runs, record results using the following matrix:

| Test ID | Description | Tester | Date | Result (PASS / FAIL) | Notes / Observations |
|---|---|---|---|---|---|
| `TC-AUTH-01` | Admin Login | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | JWT validated |
| `TC-AUTH-02` | Agent Login | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Agent prefix resolved |
| `TC-AUTH-05` | Agent Privilege Boundary | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | 403 properly emitted |
| `TC-TENANT-01`| Dynamic Table Generation | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | 13 tables verified |
| `TC-TENANT-02`| Cross-Tenant Isolation | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Zero cross-tenant bleed |
| `TC-WA-01` | Webhook Challenge Handshake | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Challenge echoed |
| `TC-WA-02` | Inbound Message Ingestion | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Redis cache invalidated |
| `TC-FE-RESP-01`| Desktop Max Width 90vw | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Verified in DevTools |
| `TC-FE-RESP-02`| Mobile Max Width 95vw | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Verified in DevTools |
| `TC-FE-STYLE-01`| Zero Emoji Icons | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Only SVG vectors used |
| `TC-FE-STYLE-02`| No Pill Tags for Titles | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Headers clean |
| `TC-FE-STYLE-03`| WebP Image Formats | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | All images webp |
