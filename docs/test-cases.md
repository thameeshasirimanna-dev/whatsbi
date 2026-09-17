# WhatsBi Test Cases & Quality Assurance Specification

This document provides the complete test case catalog for WhatsBi. In accordance with project operational rules, **all test cases must be executed manually by engineers**; they are never executed automatically by the AI assistant.

---

## 1. Test Execution Protocol & Guidelines

### Rules of Engagement
1. **Manual Execution Only**: Tests must be triggered manually using curl, Postman, or local browser sessions.
2. **Credential Safety**: Never hardcode real API keys or tokens in test scripts or logs. Always source credentials from local `.env` files.
3. **Tenant Isolation Verification**: Whenever database tests are executed, verify that tenant data does not leak across table prefixes.
4. **Clean-up Post Testing**: Test agents created during manual test runs must be deprovisioned to clean up dynamically allocated tables.
5. **Local Webhook Publishing (ngrok)**: To test Meta WhatsApp Cloud API webhooks locally, run `npm run tunnel` in `backend/`. This publishes `http://localhost:8080` to an HTTPS ngrok URL and outputs the exact webhook callback endpoint (`https://<id>.ngrok-free.app/whatsapp-webhook`) and verify token.

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

### Suite 7: Native DeepSeek AI Chatbot (TC-AI)

#### TC-AI-01: Inbound WhatsApp Message Triggers Autonomous DeepSeek Reply
- **Objective**: Verify that an inbound message from a customer with `ai_enabled = true` triggers an automated, context-aware reply generated by DeepSeek and delivered via WhatsApp.
- **Preconditions**:
  - `DEEPSEEK_API_KEY` configured in `.env`.
  - Agent has active WhatsApp configuration (`phone_number_id`, `api_key`).
  - Customer record has `ai_enabled = true`.
  - Agent has `credits >= 1`.
- **Manual Step**:
  1. Send inbound WhatsApp message:
     ```bash
     curl -X POST http://localhost:8080/whatsapp-webhook \
       -H "Content-Type: application/json" \
       -d '{
         "object": "whatsapp_business_account",
         "entry": [{
           "id": "123456",
           "changes": [{
             "value": {
               "messaging_product": "whatsapp",
               "metadata": {
                 "display_phone_number": "1234567890",
                 "phone_number_id": "<YOUR_PHONE_NUMBER_ID>"
               },
               "contacts": [{"profile": {"name": "Test Customer"}, "wa_id": "1234567890"}],
               "messages": [{
                 "from": "1234567890",
                 "id": "wamid.test_inbound_ai_01",
                 "timestamp": "1710000000",
                 "text": {"body": "Hello, what products do you have available?"},
                 "type": "text"
               }]
             },
             "field": "messages"
           }]
         }]
       }'
     ```
  2. Inspect database:
     ```sql
     SELECT message, direction FROM agt_prefix_messages ORDER BY timestamp DESC LIMIT 2;
     SELECT credits FROM agents WHERE id = <agent_id>;
     SELECT * FROM whatsapp_message_logs WHERE category = 'chatbot' ORDER BY created_at DESC LIMIT 1;
     ```
- **Expected Outcome**:
  - Inbound message logged.
  - Outbound reply generated by DeepSeek quoting real catalog items/packages.
  - Zero emoji characters in reply text (sanitized by stripEmojis filter).
  - Exactly 0.01 credits deducted from `agents.credits` (consistent with WhatsBi messaging billing).
  - Socket.IO broadcast emitted and message visible in agent UI.

#### TC-AI-02: Customer AI Disabled (`ai_enabled = false`)
- **Objective**: Verify that when `ai_enabled = false`, messages are stored but no AI response is generated.
- **Preconditions**: Customer `ai_enabled` is set to `false`.
- **Manual Step**:
  1. Toggle AI off in Contact Details panel or via SQL:
     ```sql
     UPDATE agt_prefix_customers SET ai_enabled = false WHERE id = <customer_id>;
     ```
  2. Send inbound message via `/whatsapp-webhook`.
  3. Check messages table.
- **Expected Outcome**: Inbound message persisted; no outbound AI reply created; credits unchanged.

#### TC-AI-03: Insufficient Agent Credits Handling (< 0.01 Credits)
- **Objective**: Verify that agents with insufficient credits (< 0.01) do not trigger DeepSeek calls or crash the webhook.
- **Preconditions**: Set `agents.credits = 0.00`.
- **Manual Step**:
  1. Send inbound WhatsApp message with `ai_enabled = true`.
  2. Check backend server console logs.
- **Expected Outcome**: Warning logged: `Insufficient credits for AI reply`; webhook responds HTTP 200; no credits negative drift.

#### TC-AI-04: Product Inquiry CRM Action (`POST /trigger-ai-response`)
- **Objective**: Verify that selecting a product in the conversation drawer dispatches an AI-generated product overview to the customer.
- **Manual Step**:
  ```bash
  curl -X POST http://localhost:8080/trigger-ai-response \
    -H "Authorization: Bearer <AGENT_JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{
      "customer_id": 1,
      "action_type": "product_inquiry",
      "product_id": 1
    }'
  ```
- **Expected Outcome**: HTTP 200, response contains generated product text without emojis; outbound message created; 0.01 credits deducted.

#### TC-AI-05: Service Inquiry CRM Action (`POST /trigger-ai-response`)
- **Objective**: Verify that selecting a service in the conversation drawer dispatches an AI-generated service overview with available packages to the customer.
- **Manual Step**:
  ```bash
  curl -X POST http://localhost:8080/trigger-ai-response \
    -H "Authorization: Bearer <AGENT_JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{
      "customer_id": 1,
      "action_type": "service_inquiry",
      "service_id": 1
    }'
  ```
- **Expected Outcome**: HTTP 200, response contains generated service packages and pricing details without emojis; outbound message created; 0.01 credits deducted.

#### TC-AI-06: WhatsApp Setup Without External Webhook
- **Objective**: Verify that WhatsApp configuration can be set up and saved without providing a webhook URL.
- **Manual Step**:
  1. Open WhatsAppSetupModal in browser.
  2. Enter valid WhatsApp Number and API credentials, leaving Webhook URL blank.
  3. Submit the form.
- **Expected Outcome**: Form validation passes; configuration saves successfully (`webhook_url` stored as NULL); banner confirms DeepSeek AI active.

#### TC-AI-07: Multilingual Inbound Response (Sinhala / Singlish)
- **Objective**: Verify that when a customer inquires in Sinhala or Singlish, DeepSeek responds in natural, polite Sinhala or Singlish matching the customer language.
- **Manual Step**:
  1. Send inbound WhatsApp message: `"oyalage packages gana wistara tikak kiyanna puluwanda?"`
  2. Inspect outbound reply in `{prefix}_messages`.
- **Expected Outcome**: Response is delivered in natural Sinhala/Singlish, contains no emojis, quotes real packages, and deducts 0.01 credits.

---

### Suite 8: Invoice-First Sales Lifecycle (Invert Order & Invoice Flow)

#### TC-INV-01: Standalone Invoice Creation Without Existing Order
- **Objective**: Verify an agent can issue an invoice with line items, advance amount, and discount directly for a customer before an order exists in the CRM.
- **Manual Step**:
  1. Navigate to Invoices page (`/invoices`) or open customer conversation and click the Invoices tab.
  2. Click **Create Invoice** / **Generate Invoice**.
  3. Select customer (if on `/invoices`), provide line items (item name, qty, price) or click Quick Add from Inventory/Services.
  4. Specify Discount % (e.g. 5%) and Advance Amount (e.g. 2000 LKR).
  5. Click **Generate Invoice**.
- **Expected Outcome**:
  - Invoice record saved in `{prefix}_orders_invoices` with `customer_id`, `order_id = NULL`, `status = 'generated'`.
  - Line items saved in `{prefix}_orders_items` linked to `invoice_id`.
  - PDF generated and uploaded to Cloudflare R2; appears in Invoices table and tab.

#### TC-INV-02: Send Invoice via WhatsApp with Automatic Reference
- **Objective**: Verify that sending an invoice without a pre-existing order delivers the PDF template correctly using `#INV-XXXX` reference.
- **Manual Step**:
  1. Locate the generated invoice in Invoices table or customer Invoices tab.
  2. Click **Send** (WhatsApp).
  3. Verify WhatsApp delivery on test recipient device.
- **Expected Outcome**:
  - Template sent via Meta Graph API with document header.
  - Reference displayed as `#INV-XXXX`.
  - Invoice status updates from `generated` to `sent`.

#### TC-INV-03: Mark Paid & Create Order from Invoice (`action=create-order-from-invoice`)
- **Objective**: Verify that confirming customer payment atomically creates a CRM Order and links line items and invoice.
- **Manual Step**:
  1. On a `generated` or `sent` invoice, click **Mark Paid & Create Order**.
  2. In the confirmation modal, review invoice details.
  3. Enter confirmed paid / advance amount, shipping address, delivery date, and order notes.
  4. Click **Confirm & Create Order**.
- **Expected Outcome**:
  - Backend executes atomic transaction:
    - Creates order in `{prefix}_orders` with `customer_id`, `payment_status` ('paid' or 'partially_paid'), `advance_amount`, and `invoice_id = invoice.id`.
    - Updates line items in `{prefix}_orders_items` with `order_id = new_order.id`.
    - Updates `{prefix}_orders_invoices` with `status = 'paid'` and `order_id = new_order.id`.
  - UI displays success toast: `"Payment confirmed! Order created in CRM successfully."`
  - Invoices table and cards show linked `Order #XXXX` badge.
  - Orders page displays the newly created order with matching items and advance amount.

#### TC-INV-04: Mark Paid Only Without Order Creation
- **Objective**: Verify administrative ability to record an invoice as settled without creating a fulfillment order.
- **Manual Step**:
  1. Click **Mark Paid & Create Order** on an invoice.
  2. Click the link **Mark Paid Only (No Order)** at the bottom left of the modal.
- **Expected Outcome**:
  - Invoice status changes to `paid`.
  - `order_id` remains NULL.
  - No record added to `{prefix}_orders`.

#### TC-INV-05: Legacy Order-Invoice Backward Compatibility
- **Objective**: Verify that invoices created prior to the flow inversion (linked to existing orders) remain viewable, downloadable, and correctly linked.
- **Manual Step**:
  1. Open Invoices page and filter for historical invoices.
  2. Inspect the Order column and click View / Download.
- **Expected Outcome**:
  - Order number renders as `#XXXX` with Package icon.
  - PDF opens and downloads without errors.

#### TC-INV-06: Customer Search & Contact Number in Invoice Modal
- **Objective**: Verify that the invoice creation modal allows searching customers by name or contact number and shows their phone number in the dropdown list.
- **Manual Step**:
  1. Click **Create Invoice** on `/invoices`.
  2. In the Customer search bar, type part of a customer's name (e.g. "John") or part of their phone number (e.g. "771").
  3. Observe the dropdown options.
  4. Select a customer.
  5. Verify the selected customer card.
  6. Click "Change" to clear and search another customer.
- **Expected Outcome**:
  - Dropdown options display each customer's name and contact number with a phone vector icon.
  - Search filters dynamically by name and phone number.
  - Selecting a customer sets the title and displays their contact number.
  - Clicking "Change" clears selection and re-opens search.

#### TC-INV-07: Customer Dropdown Position Stays Correct After Modal Scroll
- **Objective**: Verify that the customer search dropdown remains correctly aligned below the search input after the modal content has been scrolled.
- **Manual Step**:
  1. Click **Create Invoice** on `/invoices`.
  2. Click the Customer search input to open the dropdown.
  3. Close the dropdown by pressing Escape or clicking elsewhere.
  4. Scroll the modal form body down slightly.
  5. Click the Customer search input again.
- **Expected Outcome**:
  - Dropdown appears directly beneath the search input, not at an offset old position.

#### TC-INV-08: Customer Search & Selection from Invoices Page (Standalone)
- **Objective**: Confirm that customer search and selection fully works when opening the Create Invoice modal directly from the Invoices page (no pre-selected customer).
- **Manual Step**:
  1. Navigate to `/invoices`.
  2. Click **Create Invoice**.
  3. Type a customer name in the search box.
  4. Click a customer from the dropdown.
  5. Verify the customer info card is displayed with name and phone.
  6. Add a line item and click **Generate Invoice**.
- **Expected Outcome**:
  - Customer is searchable and selectable.
  - Invoice generates successfully with the selected customer's ID and name.
  - No "Please select a customer" error appears.

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
| `TC-AI-01` | Inbound DeepSeek Autonomous Reply | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Contextual reply & credit deducted |
| `TC-AI-02` | AI Disabled Per-Customer Toggle | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | No AI reply generated |
| `TC-AI-03` | Insufficient Credits Guard | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Skipped without failure |
| `TC-AI-04` | Product CRM Trigger | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | DeepSeek product overview dispatched |
| `TC-AI-05` | Service CRM Trigger | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | DeepSeek service overview dispatched |
| `TC-AI-06` | Setup Without Webhook URL | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Successfully configured |
| `TC-INV-01` | Standalone Invoice Creation | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Created without existing order |
| `TC-INV-02` | Send Invoice via WhatsApp | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Template delivered with INV ref |
| `TC-INV-03` | Mark Paid & Create Order | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Order created upon payment |
| `TC-INV-04` | Mark Paid Only (No Order) | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Status marked paid, order null |
| `TC-INV-05` | Legacy Backward Compatibility | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Historical invoices intact |
| `TC-INV-06` | Customer Search with Contact # | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Search by name/phone & contact displayed |
| `TC-INV-07` | Customer Dropdown Position (Scroll) | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Dropdown stays aligned when modal scrolled |
| `TC-INV-08` | Customer Search from Invoices Page | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Can search & select customer when opened from Invoices tab |
| `TC-FE-RESP-01`| Desktop Max Width 90vw | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Verified in DevTools |
| `TC-FE-RESP-02`| Mobile Max Width 95vw | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Verified in DevTools |
| `TC-FE-STYLE-01`| Zero Emoji Icons | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Only SVG vectors used |
| `TC-FE-STYLE-02`| No Pill Tags for Titles | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | Headers clean |
| `TC-FE-STYLE-03`| WebP Image Formats | [Tester Name] | YYYY-MM-DD | [PASS / FAIL] | All images webp |
