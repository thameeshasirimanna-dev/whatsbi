# Database Structure

This document describes the database schema for the iDesign WhatsApp CRM application. The schema includes core tables for users, agents, WhatsApp configuration, and agent-specific dynamic tables for customers, messages, orders, and order items.

## Core Tables

### Users Table
Stores user information for authentication and authorization.

```sql
CREATE TABLE public.users (
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  role USER-DEFINED NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
```

### Agents Table
Stores agent information, linked to users.

```sql
CREATE TABLE public.agents (
  id bigint NOT NULL DEFAULT nextval('agents_id_seq'::regclass),
  agent_prefix character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  user_id uuid,
  created_by uuid NOT NULL,
  CONSTRAINT agents_pkey PRIMARY KEY (id),
  CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

### WhatsApp Configuration Table
Stores WhatsApp integration settings per user.

```sql
CREATE TABLE public.whatsapp_configuration (
  id bigint NOT NULL DEFAULT nextval('whatsapp_configuration_id_seq'::regclass),
  user_id uuid NOT NULL UNIQUE,
  whatsapp_number character varying NOT NULL,
  webhook_url text NOT NULL,
  api_key text,
  business_account_id character varying,
  phone_number_id character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT whatsapp_configuration_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_configuration_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

## Dynamic Agent Tables
Each agent has dynamically created tables prefixed with `agt_{agent_id}_` (e.g., `agt_3784_`). These tables store customer-specific data.

### Customers Table (e.g., agt_3784_customers)
Stores customer information for a specific agent.

```sql
CREATE TABLE public.agt_3784_customers (
  id integer NOT NULL DEFAULT nextval('agt_3784_customers_id_seq'::regclass),
  agent_id bigint NOT NULL DEFAULT '62'::bigint,
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  profile_image_url text,
  CONSTRAINT agt_3784_customers_pkey PRIMARY KEY (id),
  CONSTRAINT agt_3784_customers_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id)
);
```

### Messages Table (e.g., agt_3784_messages)
Stores WhatsApp messages for customers.

```sql
CREATE TABLE public.agt_3784_messages (
  id integer NOT NULL DEFAULT nextval('agt_3784_messages_id_seq'::regclass),
  customer_id integer NOT NULL,
  message text NOT NULL,
  direction character varying NOT NULL CHECK (direction::text = ANY (ARRAY['inbound'::character varying, 'outbound'::character varying]::text[])),
  timestamp timestamp without time zone DEFAULT now(),
  is_read boolean DEFAULT false,
  media_type USER-DEFINED DEFAULT 'none'::media_type,
  media_url text,
  caption text,
  CONSTRAINT agt_3784_messages_pkey PRIMARY KEY (id),
  CONSTRAINT agt_3784_messages_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.agt_3784_customers(id)
);
```

### Orders Table (e.g., agt_3784_orders)
Stores customer orders.

```sql
CREATE TABLE public.agt_3784_orders (
  id integer NOT NULL DEFAULT nextval('agt_3784_orders_id_seq'::regclass),
  customer_id integer NOT NULL,
  total_amount numeric DEFAULT 0,
  status character varying DEFAULT 'pending'::character varying,
  notes text,
  shipping_address text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT agt_3784_orders_pkey PRIMARY KEY (id),
  CONSTRAINT agt_3784_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.agt_3784_customers(id)
);
```

### Order Items Table (e.g., agt_3784_orders_items)
Stores individual items within orders.

```sql
CREATE TABLE public.agt_3784_orders_items (
  id integer NOT NULL DEFAULT nextval('agt_3784_orders_items_id_seq'::regclass),
  order_id integer NOT NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0::numeric),
  total numeric DEFAULT ((quantity)::numeric * price),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT agt_3784_orders_items_pkey PRIMARY KEY (id),
  CONSTRAINT agt_3784_orders_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.agt_3784_orders(id)
);
```

## Notes
- Dynamic tables are created per agent using the agent ID (e.g., `agt_3784_` for agent ID 3784).
- Enums like `role` and `media_type` are defined separately in `database/schema/enums.sql`.
- Foreign key constraints ensure data integrity across tables.
- Timestamps use `timestamptz` for timezone awareness where applicable.
- This schema supports WhatsApp CRM functionality including message handling, customer management, and order processing.

For migration scripts and functions, refer to the `database/migrations/` and `database/schema/` directories.