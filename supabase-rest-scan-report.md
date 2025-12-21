# Supabase REST API Direct Usage Report

## Scan Summary
- **Scan Date**: 2025-12-21
- **Total Direct REST Calls Found**: 12
- **Database REST API Calls (/rest/v1/)**: 0
- **PostgREST Direct Calls**: 0
- **Axios Calls to Supabase**: 0
- **Storage API Calls**: 3
- **Edge Functions API Calls**: 8
- **Backend API Calls**: 1
- **Direct Supabase Table Queries (.from() calls)**: 200+

## Direct Supabase REST API Calls

### 1. File: `frontend/src/components/agent/settings/SettingsPage.tsx`
- **Line**: 553
- **Endpoint**: `https://itvaqysqzdmwhucllktz.supabase.co/storage/v1/object/public/invoices/IDesign%20Invoice%20Template.png`
- **Table Accessed**: N/A (Storage bucket object)
- **Operation**: read (GET)
- **Payload Size Risk**: low
- **Purpose**: Download invoice template image

### 2. File: `frontend/src/components/EditAgentModal.tsx`
- **Line**: 121
- **Endpoint**: `https://itvaqysqzdmwhucllktz.supabase.co/functions/v1/update-agent`
- **Table Accessed**: N/A (Edge Function)
- **Operation**: write (PATCH)
- **Payload Size Risk**: medium
- **Purpose**: Update agent details via Edge Function

### 3. File: `frontend/src/components/agent/templates/TemplatesPage.tsx`
- **Line**: 2207
- **Endpoint**: `${supabaseUrl}/functions/v1/whatsapp-webhook` (supabaseUrl = `https://itvaqysqzdmwhucllktz.supabase.co`)
- **Table Accessed**: N/A (Edge Function)
- **Operation**: read (GET)
- **Payload Size Risk**: low
- **Purpose**: Verify WhatsApp webhook

### 4. File: `frontend/src/components/agent/conversations/ConversationsPage.tsx`
- **Line**: 223
- **Endpoint**: `${supabaseUrl}/functions/v1/whatsapp-webhook` (supabaseUrl = `https://itvaqysqzdmwhucllktz.supabase.co`)
- **Table Accessed**: N/A (Edge Function)
- **Operation**: read (GET)
- **Payload Size Risk**: low
- **Purpose**: Send webhook message

### 5. File: `frontend/src/components/agent/conversations/ConversationsPage.tsx`
- **Line**: 459
- **Endpoint**: `${supabaseUrl}/functions/v1/send-whatsapp-message` (supabaseUrl = `https://itvaqysqzdmwhucllktz.supabase.co`)
- **Table Accessed**: N/A (Edge Function)
- **Operation**: write (POST)
- **Payload Size Risk**: medium
- **Purpose**: Send WhatsApp message

### 6. File: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx`
- **Line**: 400
- **Endpoint**: `${supabaseUrl}/functions/v1/send-invoice-template` (supabaseUrl = `https://itvaqysqzdmwhucllktz.supabase.co`)
- **Table Accessed**: N/A (Edge Function)
- **Operation**: write (POST)
- **Payload Size Risk**: high
- **Purpose**: Send invoice template

### 7. File: `frontend/src/components/agent/invoices/InvoicesPage.tsx`
- **Line**: 881
- **Endpoint**: `${supabaseUrl}/functions/v1/send-invoice-template` (supabaseUrl = `https://itvaqysqzdmwhucllktz.supabase.co`)
- **Table Accessed**: N/A (Edge Function)
- **Operation**: write (POST)
- **Payload Size Risk**: high
- **Purpose**: Send invoice template

### 8. File: `frontend/src/components/agent/customers/CustomersPage.tsx`
- **Line**: 574
- **Endpoint**: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-whatsapp-profile-pic`
- **Table Accessed**: N/A (Edge Function)
- **Operation**: write (POST)
- **Payload Size Risk**: low
- **Purpose**: Fetch WhatsApp profile picture

### 9. File: `frontend/src/hooks/useAppointments.ts`
- **Line**: 38
- **Endpoint**: `${supabaseUrl}/functions/v1/manage-appointments` (supabaseUrl = `https://itvaqysqzdmwhucllktz.supabase.co`)
- **Table Accessed**: N/A (Edge Function)
- **Operation**: write (POST)
- **Payload Size Risk**: medium
- **Purpose**: Manage appointments

### 10. File: `frontend/src/hooks/useAnalytics.ts`
- **Line**: 34
- **Endpoint**: `${backendUrl}/get-analytics` (backendUrl = `http://localhost:8080`)
- **Table Accessed**: {agentPrefix}_customers, {agentPrefix}_orders, {agentPrefix}_appointments
- **Operation**: read (GET)
- **Payload Size Risk**: low
- **Purpose**: Get analytics data from backend API

### 11. File: `frontend/src/lib/invoice-pdf.ts`
- **Line**: 95
- **Endpoint**: `supabase.storage.from("agent-templates")`
- **Table Accessed**: N/A (Storage bucket)
- **Operation**: read (GET)
- **Payload Size Risk**: low
- **Purpose**: Download agent template

### 12. File: `frontend/src/lib/invoice-pdf.ts`
- **Line**: 329
- **Endpoint**: `supabase.storage.from("invoices")`
- **Table Accessed**: N/A (Storage bucket)
- **Operation**: write (UPLOAD)
- **Payload Size Risk**: high
- **Purpose**: Upload invoice PDF

## Direct Supabase Table Queries

The following components make direct queries to Supabase tables using the Supabase client library (.from() method). These are categorized by table and operation type.

### Core Tables

#### agents table
- **File**: `frontend/src/components/agent/orders/EditOrderModal.tsx:62` - SELECT business_type
- **File**: `frontend/src/components/agent/orders/OrdersPage.tsx:91` - SELECT id, agent_prefix
- **File**: `frontend/src/components/agent/orders/OrderDetailsPage.tsx:60` - SELECT id, agent_prefix
- **File**: `frontend/src/components/agent/dashboard/AgentDashboard.tsx:101` - SELECT id, agent_prefix
- **File**: `frontend/src/components/agent/conversations/ServiceSelectorModal.tsx:60` - SELECT id, agent_prefix
- **File**: `frontend/src/components/agent/conversations/MessageView.tsx:330` - SELECT user_id
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:965` - SELECT various fields
- **File**: `frontend/src/components/agent/appointments/AppointmentsPage.tsx:137` - SELECT id, agent_prefix
- **File**: `frontend/src/components/agent/settings/SettingsPage.tsx:64` - SELECT various fields
- **File**: `frontend/src/components/agent/customers/CustomersPage.tsx:392` - SELECT id, agent_prefix
- **File**: `frontend/src/components/agent/customers/CreateOrderModal.tsx:57` - SELECT business_type
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:111` - SELECT various fields
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:414` - SELECT invoice_template_path

#### users table
- **File**: `frontend/src/components/AdminDashboard.tsx:82` - SELECT role
- **File**: `frontend/src/components/AdminDashboard.tsx:99` - SELECT id
- **File**: `frontend/src/components/LoginPage.tsx:86` - SELECT role
- **File**: `frontend/src/components/LoginPage.tsx:151` - SELECT role
- **File**: `frontend/src/components/LoginPage.tsx:175` - SELECT role
- **File**: `frontend/src/components/agent/dashboard/AgentDashboard.tsx:116` - SELECT name
- **File**: `frontend/src/components/agent/settings/SettingsPage.tsx:79` - SELECT name
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:134` - SELECT name
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:132` - SELECT name

#### whatsapp_configuration table
- **File**: `frontend/src/components/agent/templates/TemplatesPage.tsx:102` - SELECT business_account_id, phone_number_id, api_key
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:194` - SELECT webhook_url, phone_number_id
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:2189` - SELECT business_account_id, phone_number_id, api_key
- **File**: `frontend/src/components/agent/settings/SettingsPage.tsx:92` - SELECT whatsapp_number
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:152` - SELECT phone_number_id, api_key

- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:143` - SELECT phone_number_id, api_key

### Dynamic Agent Tables

#### {agent_prefix}_customers table
- **File**: `frontend/src/components/agent/orders/OrdersPage.tsx:117` - SELECT id, name, phone
- **File**: `frontend/src/components/agent/conversations/ContactDetails.tsx:67` - UPDATE various fields
- **File**: `frontend/src/components/agent/conversations/ContactDetails.tsx:113` - UPDATE various fields
- **File**: `frontend/src/components/agent/conversations/LeadStageModal.tsx:97` - SELECT lead_stage fields
- **File**: `frontend/src/components/agent/conversations/LeadStageModal.tsx:135` - UPDATE lead_stage fields
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:108` - SELECT id
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:656` - SELECT various fields
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:754` - SELECT id, name, phone, last_user_message_time, ai_enabled
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:801` - INSERT new customer
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:1003` - SELECT various fields
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:1187` - SELECT various fields
- **File**: `frontend/src/components/agent/shared/AgentLayout.tsx:99` - SELECT id, name, phone
- **File**: `frontend/src/components/agent/shared/AgentLayout.tsx:166` - SELECT name, phone
- **File**: `frontend/src/components/agent/appointments/AppointmentsPage.tsx:151` - SELECT id, name, phone
- **File**: `frontend/src/components/agent/customers/CustomersPage.tsx:302` - INSERT new customer
- **File**: `frontend/src/components/agent/customers/CustomersPage.tsx:347` - UPDATE customer
- **File**: `frontend/src/components/agent/customers/CustomersPage.tsx:417` - SELECT various fields
- **File**: `frontend/src/components/agent/customers/CustomersPage.tsx:429` - SELECT count
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:169` - SELECT id, name
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:212` - SELECT id, name
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:277` - SELECT id, name
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:820` - SELECT id, name, phone, last_user_message_time
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:833` - SELECT id, name, phone, last_user_message_time

#### {agent_prefix}_orders table
- **File**: `frontend/src/components/agent/orders/OrdersPage.tsx:146` - SELECT various fields
- **File**: `frontend/src/components/agent/orders/OrdersPage.tsx:355` - UPDATE status
- **File**: `frontend/src/components/agent/orders/OrdersPage.tsx:400` - DELETE order
- **File**: `frontend/src/components/agent/orders/EditOrderModal.tsx:227` - UPDATE order
- **File**: `frontend/src/components/agent/orders/OrderDetailsPage.tsx:87` - SELECT various fields
- **File**: `frontend/src/components/agent/orders/OrderDetailsPage.tsx:169` - UPDATE order
- **File**: `frontend/src/components/agent/conversations/GenerateInvoiceModal.tsx:87` - SELECT id, customer_id, status, notes, created_at
- **File**: `frontend/src/components/agent/conversations/OrdersTab.tsx:45` - DELETE order
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:166` - SELECT various fields
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:340` - DELETE order
- **File**: `frontend/src/components/agent/customers/CreateOrderModal.tsx:169` - INSERT new order
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:186` - SELECT various fields
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:261` - SELECT id, customer_id
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:820` - SELECT customer_id

#### {agent_prefix}_order_items table
- **File**: `frontend/src/components/agent/orders/OrdersPage.tsx:172` - SELECT name, quantity, price
- **File**: `frontend/src/components/agent/orders/EditOrderModal.tsx:123` - SELECT name, quantity, price
- **File**: `frontend/src/components/agent/orders/EditOrderModal.tsx:241` - DELETE items
- **File**: `frontend/src/components/agent/orders/EditOrderModal.tsx:256` - INSERT items
- **File**: `frontend/src/components/agent/orders/OrderDetailsPage.tsx:117` - SELECT name, quantity, price
- **File**: `frontend/src/components/agent/orders/ViewOrderModal.tsx:39` - SELECT name, quantity, price
- **File**: `frontend/src/components/agent/conversations/GenerateInvoiceModal.tsx:99` - SELECT name, quantity, price, total
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:186` - SELECT various fields
- **File**: `frontend/src/components/agent/customers/CreateOrderModal.tsx:229` - INSERT order items
- **File**: `frontend/src/components/agent/customers/CreateOrderModal.tsx:241` - INSERT single item
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:297` - SELECT order_id, total
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:431` - SELECT name, quantity, price, total

#### {agent_prefix}_messages table
- **File**: `frontend/src/components/agent/dashboard/AgentDashboard.tsx:146` - SELECT id, customer_id, message, direction, timestamp, is_read
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:1029` - SELECT various fields
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:1199` - SELECT all fields
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:563` - UPDATE is_read
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:1325` - UPDATE is_read
- **File**: `frontend/src/components/agent/shared/AgentLayout.tsx:79` - SELECT count
- **File**: `frontend/src/components/agent/shared/AgentLayout.tsx:89` - SELECT id, message, timestamp, customer_id

#### {agent_prefix}_orders_invoices table
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:186` - SELECT various fields
- **File**: `frontend/src/components/agent/conversations/InvoicesTab.tsx:97` - DELETE invoice
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:462` - DELETE invoice
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:494` - UPDATE invoice
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:251` - SELECT id, name, pdf_url, status, generated_at, order_id
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:750` - INSERT new invoice
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:807` - SELECT id, name, pdf_url, order_id, discount_percentage, status
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:910` - UPDATE invoice
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:942` - UPDATE invoice
- **File**: `frontend/src/components/agent/invoices/InvoicesPage.tsx:1021` - DELETE invoice

#### {agent_prefix}_inventory table
- **File**: `frontend/src/components/agent/conversations/ProductSelectorModal.tsx:57` - SELECT id, name, description, price, image_urls, category_id

#### {agent_prefix}_appointments table
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:221` - SELECT various fields
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:251` - INSERT new appointment
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:281` - UPDATE appointment
- **File**: `frontend/src/components/agent/conversations/CustomerOrdersModal.tsx:299` - DELETE appointment

#### {agent_prefix}_services table
- **File**: `frontend/src/components/agent/conversations/ServiceSelectorModal.tsx:76` - SELECT id, service_name, description

#### {agent_prefix}_service_packages table
- **File**: `frontend/src/components/agent/services/EditServiceModal.tsx:201` - INSERT package
- **File**: `frontend/src/components/agent/services/EditServiceModal.tsx:227` - UPDATE package
- **File**: `frontend/src/components/agent/services/EditServiceModal.tsx:247` - DELETE packages

#### {agent_prefix}_templates table
- **File**: `frontend/src/components/agent/templates/TemplatesPage.tsx:122` - SELECT all fields
- **File**: `frontend/src/components/agent/templates/TemplatesPage.tsx:186` - UPDATE is_active
- **File**: `frontend/src/components/agent/templates/TemplatesPage.tsx:209` - UPSERT templates
- **File**: `frontend/src/components/agent/templates/TemplatesPage.tsx:267` - DELETE template
- **File**: `frontend/src/components/agent/templates/CreateTemplateModal.tsx:861` - UPDATE template
- **File**: `frontend/src/components/agent/templates/CreateTemplateModal.tsx:878` - INSERT template
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:282` - SELECT all fields
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:1879` - SELECT all fields
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:1959` - SELECT all fields
- **File**: `frontend/src/components/agent/conversations/ConversationsPage.tsx:2061` - SELECT all fields

## Analysis

### Risk Assessment
- **Low Risk**: 4 REST calls (Storage GET, webhook verification, analytics via backend) + ~120 table SELECT operations
- **Medium Risk**: 4 REST calls (Agent update, WhatsApp message, appointments, profile pic) + ~40 table INSERT/UPDATE operations
- **High Risk**: 4 REST calls (Invoice template sending - large payloads) + ~20 table DELETE operations

### Table Query Risk Analysis
- **SELECT Operations**: Generally low risk, but frequent queries to large tables may impact performance (~120 SELECT operations identified)
- **INSERT/UPDATE Operations**: Medium risk due to potential data consistency issues and race conditions (~40 INSERT/UPDATE operations)
- **DELETE Operations**: High risk due to potential data loss if not properly validated (~20 DELETE operations)
- **Dynamic Tables**: The use of agent-specific table prefixes adds complexity and potential for cross-agent data access

### Recommendations
1. **Storage Calls**: Consider using Supabase Storage client instead of direct fetch
2. **Edge Functions**: These are appropriate for server-side operations
3. **Table Queries**: Consider moving complex business logic to backend APIs to:
   - Centralize data validation and business rules
   - Reduce client-side complexity and potential security issues
   - Improve performance through backend caching and optimization
   - Enable better error handling and transaction management
4. **Dynamic Tables**: Implement strict validation of agent prefixes to prevent cross-agent data access
5. **Payload Size**: Monitor high-risk calls for performance impact
6. **Error Handling**: Ensure proper error handling for all direct API calls and table operations

### Notes
- All direct calls use proper authentication (Bearer tokens)
- No direct database table access via REST API found
- **200+ direct table queries** found using Supabase client `.from()` method
- Most table operations are on dynamic agent-specific tables (using `{agent_prefix}_table_name` pattern)
- Core tables (agents, users, whatsapp_configuration) are accessed directly from frontend
- Frontend constructs URLs from environment variables (`VITE_SUPABASE_URL`, `VITE_BACKEND_URL`)
- Table queries include SELECT, INSERT, UPDATE, DELETE, and UPSERT operations
- Analytics functionality moved from Edge Function to backend API for better control and performance

- Updated scan with additional frontend REST calls and table queries found during comprehensive frontend scan