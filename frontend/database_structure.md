# Database Structure Documentation

This document provides a clear, implementation-friendly overview of the database schema for the iDesign WhatsApp CRM application. It includes table descriptions, field details, relationships, and usage notes to help with development and integration.

## Core Tables

### 1. Users Table
**Purpose**: Stores user accounts for authentication, authorization, and agent management.

**Fields**:
- `id` (uuid, PRIMARY KEY, DEFAULT: gen_random_uuid()): Unique identifier for the user
- `name` (varchar, NOT NULL): User's full name
- `email` (varchar, NOT NULL, UNIQUE): User's email address (used for login)
- `role` (enum, NOT NULL): User role (defined in enums.sql - e.g., 'admin', 'agent')
- `created_at` (timestamptz, DEFAULT: CURRENT_TIMESTAMP): Account creation timestamp

**Relationships**:
- One-to-many with `agents` (user_id)
- One-to-one with `whatsapp_configuration` (user_id)

**Usage Notes**:
- Use email for authentication
- Role determines access permissions
- Created by Supabase Auth or admin panel

---

### 2. Agents Table
**Purpose**: Stores agent profiles and their associated user accounts. Each agent gets dynamic tables for their data.

**Fields**:
- `id` (bigint, PRIMARY KEY, DEFAULT: nextval('agents_id_seq')): Unique agent identifier
- `agent_prefix` (varchar, NOT NULL, UNIQUE): Unique prefix for dynamic tables (e.g., 'agt_3784')
- `user_id` (uuid, FOREIGN KEY to users.id): Associated user account (nullable for system agents)
- `created_by` (uuid, NOT NULL, FOREIGN KEY to users.id): User who created this agent
- `created_at` (timestamptz, DEFAULT: CURRENT_TIMESTAMP): Agent creation timestamp

**Relationships**:
- Many-to-one with `users` (user_id)
- Many-to-one with `users` (created_by)
- One-to-many with dynamic agent tables (agent_id)

**Usage Notes**:
- Agent prefix is used to create dynamic tables: `agt_{agent_id}_{table_name}`
- Only one user can be assigned per agent
- System agents may have null user_id but must have created_by

---

### 3. WhatsApp Configuration Table
**Purpose**: Stores WhatsApp Business API configuration for each user/agent.

**Fields**:
- `id` (bigint, PRIMARY KEY, DEFAULT: nextval('whatsapp_configuration_id_seq')): Unique configuration ID
- `user_id` (uuid, NOT NULL, UNIQUE, FOREIGN KEY to users.id): Associated user
- `whatsapp_number` (varchar, NOT NULL): WhatsApp phone number (with country code)
- `webhook_url` (text, NOT NULL): Webhook endpoint for incoming messages
- `api_key` (text): WhatsApp Business API access token
- `business_account_id` (varchar): WhatsApp Business Account ID
- `phone_number_id` (varchar): WhatsApp Phone Number ID
- `is_active` (boolean, DEFAULT: true): Whether this configuration is active
- `created_at` (timestamptz, DEFAULT: CURRENT_TIMESTAMP): Creation timestamp
- `updated_at` (timestamptz, DEFAULT: CURRENT_TIMESTAMP): Last update timestamp

**Relationships**:
- One-to-one with `users` (user_id)

**Usage Notes**:
- Each user can have only one active WhatsApp configuration
- Required for sending/receiving WhatsApp messages
- Update `updated_at` on any configuration changes
- Store securely - never expose api_key in client code

## Dynamic Agent Tables
Each agent gets four dedicated tables prefixed with `agt_{agent_id}_`. These are created automatically when an agent is set up.

**Table Naming Convention**: `agt_{agent_id}_{table_name}`
**Example**: For agent ID 3784: `agt_3784_customers`, `agt_3784_messages`, etc.

### 4. Agent Customers Table (agt_{agent_id}_customers)
**Purpose**: Stores customer information specific to each agent.

**Fields**:
- `id` (integer, PRIMARY KEY, DEFAULT: nextval('agt_{agent_id}_customers_id_seq')): Customer ID
- `agent_id` (bigint, NOT NULL, DEFAULT: {agent_id}, FOREIGN KEY to agents.id): Associated agent
- `name` (text, NOT NULL): Customer's full name
- `phone` (text, NOT NULL): WhatsApp phone number (with country code, unique per agent)
- `profile_image_url` (text): URL to customer's profile picture
- `created_at` (timestamp, DEFAULT: now()): Customer record creation time

**Relationships**:
- Many-to-one with `agents` (agent_id)
- One-to-many with `agt_{agent_id}_messages` (customer_id)
- One-to-many with `agt_{agent_id}_orders` (customer_id)

**Usage Notes**:
- Phone numbers should be stored in E.164 format (+country code)
- Profile images are fetched from WhatsApp and stored in Supabase Storage
- Create customer record on first message from unknown number
- Each agent has isolated customer data

### 5. Agent Messages Table (agt_{agent_id}_messages)
**Purpose**: Stores all WhatsApp conversations for an agent's customers.

**Fields**:
- `id` (integer, PRIMARY KEY, DEFAULT: nextval('agt_{agent_id}_messages_id_seq')): Message ID
- `customer_id` (integer, NOT NULL, FOREIGN KEY to agt_{agent_id}_customers.id): Associated customer
- `message` (text, NOT NULL): Message content
- `direction` (varchar, NOT NULL, CHECK: 'inbound' or 'outbound'): Message direction
- `timestamp` (timestamp, DEFAULT: now()): Message send/receive time
- `is_read` (boolean, DEFAULT: false): Whether agent has read this message
- `media_type` (enum, DEFAULT: 'none'): Media type (defined in enums.sql: 'none', 'image', 'video', 'audio', 'document')
- `media_url` (text): URL to media file (if applicable)
- `caption` (text): Caption for media messages

**Relationships**:
- Many-to-one with `agt_{agent_id}_customers` (customer_id)

**Usage Notes**:
- Inbound = messages from customer to agent
- Outbound = messages from agent to customer
- Media files are uploaded to Supabase Storage
- Update `is_read` when agent views conversation
- Use `timestamp` for message ordering and real-time updates

### 6. Agent Orders Table (agt_{agent_id}_orders)
**Purpose**: Tracks customer orders and their status.

**Fields**:
- `id` (integer, PRIMARY KEY, DEFAULT: nextval('agt_{agent_id}_orders_id_seq')): Order ID
- `customer_id` (integer, NOT NULL, FOREIGN KEY to agt_{agent_id}_customers.id): Associated customer
- `total_amount` (numeric, DEFAULT: 0): Total order amount
- `status` (varchar, DEFAULT: 'pending'): Order status ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
- `notes` (text): Additional order notes
- `shipping_address` (text): Customer shipping address
- `created_at` (timestamp, DEFAULT: now()): Order creation time
- `updated_at` (timestamp, DEFAULT: now()): Last update time

**Relationships**:
- Many-to-one with `agt_{agent_id}_customers` (customer_id)
- One-to-many with `agt_{agent_id}_orders_items` (order_id)

**Usage Notes**:
- Total_amount is calculated from order items
- Update `updated_at` on status changes
- Status workflow: pending → confirmed → shipped → delivered/cancelled
- Shipping_address is collected during order creation
- Orders are typically created from WhatsApp conversations

### 7. Agent Order Items Table (agt_{agent_id}_orders_items)
**Purpose**: Stores individual products/services within an order.

**Fields**:
- `id` (integer, PRIMARY KEY, DEFAULT: nextval('agt_{agent_id}_orders_items_id_seq')): Item ID
- `order_id` (integer, NOT NULL, FOREIGN KEY to agt_{agent_id}_orders.id): Associated order
- `name` (text, NOT NULL): Product/service name
- `quantity` (integer, NOT NULL, DEFAULT: 1, CHECK: > 0): Item quantity
- `price` (numeric, NOT NULL, DEFAULT: 0, CHECK: >= 0): Unit price
- `total` (numeric, DEFAULT: quantity * price): Line item total
- `created_at` (timestamp, DEFAULT: now()): Item creation time

**Relationships**:
- Many-to-one with `agt_{agent_id}_orders` (order_id)

**Usage Notes**:
- Total is automatically calculated as quantity × price
- Price should include taxes if applicable
- Multiple items can be added to a single order
- Item names should be descriptive for order tracking

## Key Relationships Summary

```
Users (1) ←→ (1) WhatsApp Configuration
Users (1) ←→ (*) Agents (via user_id)
Users (1) ←→ (*) Agents (via created_by)
Agents (1) ←→ (*) Agent Customers (agent_id)
Agent Customers (1) ←→ (*) Agent Messages (customer_id)
Agent Customers (1) ←→ (*) Agent Orders (customer_id)
Agent Orders (1) ←→ (*) Agent Order Items (order_id)
```

## Implementation Guidelines

### Data Isolation
- Each agent has completely isolated customer data
- Never mix data between different agent tables
- Use agent_prefix to dynamically construct table names in queries

### Timezone Handling
- Core tables (users, agents, whatsapp_config) use timestamptz for timezone awareness
- Agent-specific tables use timestamp (local time)
- Always convert timestamps appropriately when displaying to users

### Enums (defined in database/schema/enums.sql)
- `role`: User roles ('admin', 'agent', 'super_admin')
- `media_type`: Message media types ('none', 'image', 'video', 'audio', 'document', 'sticker')
- `order_status`: Order workflow states ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')

### Security Considerations
- Never expose WhatsApp API keys in client-side code
- Use Row Level Security (RLS) policies for all tables
- Validate all inputs before database operations
- Agent data should only be accessible by the owning user

### Query Patterns

**Get Agent's Customers**:
```sql
SELECT * FROM agt_3784_customers 
WHERE agent_id = 3784 
ORDER BY created_at DESC;
```

**Get Recent Messages for Customer**:
```sql
SELECT * FROM agt_3784_messages 
WHERE customer_id = 123 
ORDER BY timestamp DESC 
LIMIT 50;
```

**Create New Order**:
```sql
-- Insert order
INSERT INTO agt_3784_orders (customer_id, total_amount, status) 
VALUES (123, 150.00, 'pending') 
RETURNING id;

-- Insert order items
INSERT INTO agt_3784_orders_items (order_id, name, quantity, price, total)
VALUES (1, 'Product A', 2, 50.00, 100.00),
       (1, 'Product B', 1, 50.00, 50.00);
```

## Migration and Functions
- Migration scripts: `database/migrations/`
- Schema functions: `database/schema/`
- Dynamic table creation: `database/schema/dynamic_table_creation.sql`
- Agent management functions: `database/schema/create_agent_function.sql`

This structure supports scalable WhatsApp CRM operations with proper data isolation between agents while maintaining centralized user and configuration management.