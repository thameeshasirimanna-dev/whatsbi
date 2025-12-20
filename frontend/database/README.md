# WhatsApp CRM Database Structure

This document describes the database schema for the WhatsApp CRM application built with Supabase PostgreSQL. The schema supports multi-agent functionality with dynamic table creation for agent-specific data isolation.

## Overview

The database uses a hybrid approach:
- **Base tables** for users, agents, and global configurations
- **Dynamic tables** created per agent for customers, messages, orders, and order items
- **Row Level Security (RLS)** to enforce data isolation between agents
- **Triggers and functions** for automated table management

The schema is organized in the following SQL files:
- [`enums.sql`](schema/enums.sql) - Custom enum types
- [`base_tables.sql`](schema/base_tables.sql) - Core tables and RLS setup
- [`dynamic_table_creation.sql`](schema/dynamic_table_creation.sql) - Functions and triggers for agent-specific tables
- [`agent_management_functions.sql`](schema/agent_management_functions.sql) - CRUD operations for agents and WhatsApp config
- [`indexes.sql`](schema/indexes.sql) - Performance indexes

## Enums

### role
Defines user roles in the system.

```sql
CREATE TYPE role AS ENUM ('admin', 'agent');
```

- **admin**: System administrators with full access
- **agent**: Individual agents managing their own data

## Base Tables

### users
Stores application users (aligned with Supabase Auth).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| name | VARCHAR(255) | NOT NULL | User full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| role | role | NOT NULL | User role (admin/agent) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**RLS Policies**:
- Authenticated users can read all users
- Service role has full access

### agents
Stores agent entities and their metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Agent ID |
| agent_prefix | VARCHAR(20) | NOT NULL, UNIQUE | Unique prefix (e.g., 'agt_6f78') for dynamic tables |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| user_id | UUID | FOREIGN KEY (users.id), ON DELETE SET NULL | Associated user ID |
| created_by | UUID | NOT NULL, FOREIGN KEY (users.id), ON DELETE SET NULL | Creator user ID |

**Relationships**:
- One-to-one with users (agent belongs to one user)
- Used as foreign key in dynamic tables

**RLS Policies**:
- Authenticated users can read agents
- Users can manage their own agents (via user_id or created_by)

### whatsapp_configuration
Stores WhatsApp integration settings per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Configuration ID |
| user_id | UUID | NOT NULL, UNIQUE, FOREIGN KEY (users.id), ON DELETE CASCADE | Associated user ID |
| whatsapp_number | VARCHAR(20) | NOT NULL | WhatsApp phone number |
| webhook_url | TEXT | NOT NULL | Webhook endpoint URL |
| api_key | TEXT | | API authentication key |
| business_account_id | VARCHAR(100) | | WhatsApp Business Account ID |
| phone_number_id | VARCHAR(100) | | WhatsApp Phone Number ID |
| is_active | BOOLEAN | DEFAULT true | Configuration status |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**RLS Policies**:
- Authenticated users can read configurations
- Users can only manage their own configuration (via user_id)

## Dynamic Tables

Each agent gets isolated tables prefixed with their `agent_prefix` (e.g., `agt_6f78_customers`). These are created automatically via triggers when an agent is inserted.

### {prefix}_customers
Stores customers for a specific agent.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Customer ID |
| agent_id | BIGINT | NOT NULL, FOREIGN KEY (agents.id), ON DELETE CASCADE | Agent ID |
| name | TEXT | NOT NULL | Customer name |
| phone | TEXT | NOT NULL | Customer phone number |
| created_at | TIMESTAMP WITHOUT TIME ZONE | DEFAULT now() | Creation timestamp |

**Indexes**:
- agent_id, phone, created_at

**RLS Policy**: Agent can only access customers belonging to their agent_id.

### {prefix}_messages
Stores conversation messages for agent customers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Message ID |
| customer_id | INTEGER | NOT NULL, FOREIGN KEY ({prefix}_customers.id), ON DELETE CASCADE | Customer ID |
| message | TEXT | NOT NULL | Message content |
| direction | VARCHAR(10) | NOT NULL, CHECK (inbound/outbound) | Message direction |
| timestamp | TIMESTAMP WITHOUT TIME ZONE | DEFAULT now() | Message timestamp |

**Indexes**:
- customer_id, direction, timestamp (DESC), composite (customer_id, timestamp DESC)

**RLS Policy**: Agent can access messages via customer ownership chain.

### {prefix}_orders
Stores orders for agent customers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Order ID |
| customer_id | INTEGER | NOT NULL, FOREIGN KEY ({prefix}_customers.id), ON DELETE CASCADE | Customer ID |
| total_amount | DECIMAL(10,2) | DEFAULT 0 | Order total (calculated from items) |
| status | VARCHAR(50) | DEFAULT 'pending' | Order status (pending, confirmed, shipped, etc.) |
| notes | TEXT | | Additional notes |
| shipping_address | TEXT | | Shipping details |
| created_at | TIMESTAMP WITHOUT TIME ZONE | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | DEFAULT now() | Last update timestamp |

**Indexes**:
- customer_id, status, created_at, composite (customer_id, status)

**RLS Policy**: Agent can access orders via customer ownership chain.

### {prefix}_orders_items
Stores order line items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Item ID |
| order_id | INTEGER | NOT NULL, FOREIGN KEY ({prefix}_orders.id), ON DELETE CASCADE | Order ID |
| name | TEXT | NOT NULL | Item name |
| quantity | INTEGER | NOT NULL, DEFAULT 1, CHECK (>0) | Quantity |
| price | DECIMAL(10,2) | NOT NULL, DEFAULT 0, CHECK (>=0) | Unit price |
| total | DECIMAL(10,2) | GENERATED ALWAYS AS (quantity * price) STORED | Line item total |
| created_at | TIMESTAMP WITHOUT TIME ZONE | DEFAULT now() | Creation timestamp |

**Indexes**:
- order_id

**RLS Policy**: Agent can access items via order/customer ownership chain.

## Key Functions

### Agent Management
- **`create_agent(user_id UUID, agent_prefix VARCHAR, created_by UUID)`**: Creates agent and auto-generates dynamic tables. Returns agent JSON, success, message.
- **`update_agent_details(agent_id INTEGER, user_updates JSONB, agent_updates JSONB, current_user_id UUID)`**: Updates user and agent details (agent_prefix immutable).
- **`delete_agent(agent_id INTEGER)`**: Deletes agent, drops dynamic tables, deactivates WhatsApp config.

### WhatsApp Configuration
- **`create_whatsapp_config(user_id UUID, whatsapp_number VARCHAR, webhook_url TEXT, api_key TEXT, business_account_id VARCHAR, phone_number_id VARCHAR)`**: Creates/updates config (UPSERT).
- **`get_whatsapp_config(user_id UUID)`**: Retrieves active config.
- **`update_whatsapp_config(...)`**: Partial updates to config fields.
- **`delete_whatsapp_config(user_id UUID)`**: Deactivates config.

### Dynamic Table Management
- **`create_agent_tables(prefix TEXT, agent_id BIGINT)`**: Creates the four dynamic tables with RLS.
- **`drop_agent_tables(prefix TEXT)`**: Drops dynamic tables with error handling.
- **`create_agent_indexes(prefix TEXT)`**: Creates performance indexes post-table creation.

### Triggers
- **`trigger_create_agent_tables`**: AFTER INSERT on agents - auto-creates tables and indexes.

## Indexes

- **Base tables**: Email/role (users), prefix/user_id (agents), user_id/active (whatsapp_configuration)
- **Dynamic tables**: Agent/customer keys, phone/timestamp/status, composites for queries
- Applied via `create_agent_indexes()` function

## Relationships

```
users (1) --- (1) agents (1) --- (N) {prefix}_customers (1) --- (N) {prefix}_messages
                    |                    |
                    |                    +--- (N) {prefix}_orders (1) --- (N) {prefix}_orders_items
                    |
                    +--- (1) whatsapp_configuration
```

- Users own agents and configurations
- Agents own customers (isolated per prefix)
- Customers own messages and orders
- Orders own items
- CASCADE deletes propagate from agents to dynamic data

## Setup Instructions

1. **Run schema files in order**:
   ```
   psql -d your_supabase_db -f database/schema/enums.sql
   psql -d your_supabase_db -f database/schema/base_tables.sql
   psql -d your_supabase_db -f database/schema/dynamic_table_creation.sql
   psql -d your_supabase_db -f database/schema/agent_management_functions.sql
   psql -d your_supabase_db -f database/schema/indexes.sql
   ```

2. **Test agent creation**:
   ```sql
   SELECT * FROM create_agent(
       'user-uuid-here',
       'agt_test123',
       'creator-uuid-here'
   );
   ```

3. **Verify dynamic tables**:
   ```sql
   \dt agt_test123_*  -- Lists created tables
   ```

## Security Considerations

- **RLS enabled** on all tables
- **Ownership-based access**: Agents only see their data
- **Service role**: Full access for backend functions
- **SECURITY DEFINER**: Functions run with elevated privileges
- **Input validation**: Handled in functions (e.g., user existence checks)

## Migrations

Additional migrations are in `database/migrations/`:
- `001_create_whatsapp_configuration.sql`: Initial WhatsApp setup
- `002_add_verify_token.sql`: Authentication tokens
- `003_add_total_amount_to_orders.sql`: Order totals

For production, apply migrations via Supabase dashboard or CLI.

## Notes

- Dynamic tables ensure data isolation without complex partitioning
- Functions use JSONB for flexible updates
- Indexes optimize common queries (e.g., message timelines, order status)
- All timestamps use UTC for consistency
- Supabase Auth integration: User emails sync with auth.users table