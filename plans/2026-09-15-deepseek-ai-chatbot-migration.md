# Architectural Plan: Native DeepSeek AI Chatbot Migration

- **Plan Date**: 2026-09-15
- **Status**: [IMPLEMENTED]
- **Authors**: Biz Agentz Engineering Team
- **Scope**: Migration from external n8n webhook AI assistant to internal DeepSeek-powered AI chatbot

---

## 1. Executive Summary

Historically, Biz Agentz outsourced customer conversation AI processing to an external n8n automation webhook. Whenever an incoming message arrived, or when an agent clicked product/service inquiry buttons in the CRM interface, Biz Agentz made an outbound HTTP call to a configured n8n webhook URL. This architecture required users to supply an external webhook URL upon onboarding, created external dependencies, and fragmented conversational intelligence.

This implementation replaces the external n8n webhook with an internal, native AI chatbot engine powered by the **DeepSeek Chat model** (`deepseek-chat`). Context generation, prompt engineering, conversation memory, credit accounting, and direct Meta WhatsApp Cloud API (v23.0) outbound dispatch now execute entirely within Biz Agentz.

---

## 2. Technical Architecture

### 2.1 Inbound Workflow

```
Customer Message (WhatsApp)
          │
          ▼
POST /whatsapp-webhook (Fastify API)
          │
          ├──> 1. Persist inbound message to {agent_prefix}_messages
          ├──> 2. Emit Socket.IO event ('emitNewMessage') to agent workspace
          ├──> 3. Check customer.ai_enabled === true
          │          │
          │          ├── False: Stop (Human agent handles conversation)
          │          └── True: Proceed to AI Chatbot Service
          │
          ▼
aiChatbotService.handleInboundMessage()
          │
          ├──> Credit Check: Verify agents.credits >= 1
          ├──> WhatsApp Config Check: Verify phone_number_id & api_key exist
          ├──> Context Aggregation:
          │      • Business details (name, product vs service type)
          │      • Catalog items ({prefix}_inventory_items or {prefix}_services)
          │      • Company Overview document (read from Cloudflare R2)
          │      • Recent 10-12 conversation turns ({prefix}_messages)
          │      • Customer details (name, phone, language preference)
          │
          ▼
DeepSeek Chat Completion (POST https://api.deepseek.com/chat/completions)
          │
          ▼
Meta WhatsApp Cloud API (POST https://graph.facebook.com/v23.0/{phone_number_id}/messages)
          │
          ├──> 1. Persist outbound message in {agent_prefix}_messages (direction: 'outbound')
          ├──> 2. Deduct 0.01 credits from agents.credits
          ├──> 3. Invalidate Redis conversation and chat list caches
          ├──> 4. Broadcast Socket.IO event to agent UI in real time
          └──> 5. Log transaction in whatsapp_message_logs (category: 'chatbot')
```

### 2.2 Direct CRM Action Workflow

A dedicated endpoint `POST /trigger-ai-response` enables agent workspaces to trigger on-demand AI overviews for specific products or services:
- **Product Details Action**: When an agent selects a product in the drawer, the endpoint fetches SKU and pricing, constructs a tailored prompt, queries DeepSeek, and dispatches the message directly to the customer over WhatsApp.
- **Service Details Action**: When an agent selects a service in the drawer, the endpoint gathers package details and durations, generates a comprehensive response via DeepSeek, and delivers it to the customer.

---

## 3. Decoupling & Compatibility

1. **`webhook_url` Decoupling**: The `webhook_url` parameter in `whatsapp_configuration` and `agents` is now optional (`NULL` allowed). WhatsApp configuration no longer fails when onboarding without an external webhook.
2. **Setup Modal Optimization**: The `WhatsAppSetupModal` presents a prominent status banner confirming that the internal DeepSeek AI is active. The external webhook field is retained purely as an optional forwarding target for custom third-party integrations.
3. **Admin Dashboard Alignment**: The agent management table replaces the legacy Webhook URL column with an active indicator: "DeepSeek Built-in".

---

## 4. Environment Variables

All credentials and model configurations are maintained in `.env`:
- `DEEPSEEK_API_KEY`: Authentication bearer token for DeepSeek API.
- `DEEPSEEK_BASE_URL`: Base URL (default: `https://api.deepseek.com`).
- `DEEPSEEK_MODEL`: Target model identifier (default: `deepseek-chat`).

---

## 5. Implementation Verification

- All TypeScript components in `backend` and `frontend` compile cleanly with 0 errors.
- Manual test suite documented in `docs/test-cases.md` (Suite 8: TC-AI-01 through TC-AI-06).
