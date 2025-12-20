# Edge Function Classification Report

## 🔵 KEEP (low egress, auth-only, light logic)

### add-agent
**Purpose:** Creates new agent with auth user, database tables, and optional WhatsApp config  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Light CRUD operations

### add-credits
**Purpose:** Adds credits to agent account  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Simple database update

### delete-invoice-template
**Purpose:** Removes invoice template from storage  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Storage cleanup

### delete-whatsapp-config
**Purpose:** Soft deletes WhatsApp configuration  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Simple database update

### get-whatsapp-config
**Purpose:** Retrieves WhatsApp configuration  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Simple database read

### manage-appointments
**Purpose:** CRUD operations for appointments  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Standard CRUD operations

### manage-inventory
**Purpose:** CRUD operations for inventory items and categories  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Standard CRUD operations

### setup-whatsapp-config
**Purpose:** Initializes WhatsApp configuration and default templates  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Configuration setup

### update-agent
**Purpose:** Updates agent details and WhatsApp config  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Profile updates

### upload-company-overview
**Purpose:** Uploads company documents to storage  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Simple file upload

### upload-invoice-template
**Purpose:** Uploads invoice templates to storage  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Simple file upload

### upload-media-to-meta
**Purpose:** Uploads media to Meta's resumable API  
**Trigger:** HTTP  
**Features:** API for frontend  
**Classification:** 🔵 KEEP - Direct API proxy

## 🟡 MIGRATE (heavy logic, chat, AI, media)

### authenticated-messages-stream
**Purpose:** Server-sent events stream for real-time messages  
**Trigger:** HTTP  
**Features:** API for frontend, reads large data (message streams)  
**Classification:** 🟡 MIGRATE - Real-time streaming with database polling

### delete-agent
**Purpose:** Completely removes agent and all associated data  
**Trigger:** HTTP  
**Features:** API for frontend, heavy cleanup operations  
**Classification:** 🟡 MIGRATE - Complex multi-table deletion

### get-analytics
**Purpose:** Aggregates and returns analytics data  
**Trigger:** HTTP  
**Features:** API for frontend, reads large data (analytics aggregation)  
**Classification:** 🟡 MIGRATE - Data aggregation and reporting

### get-media-preview
**Purpose:** Downloads WhatsApp media and returns base64  
**Trigger:** HTTP  
**Features:** API for frontend, serves media, downloads large data  
**Classification:** 🟡 MIGRATE - Media processing and serving

### manage-services
**Purpose:** CRUD operations for services with image processing  
**Trigger:** HTTP  
**Features:** API for frontend, processes images  
**Classification:** 🟡 MIGRATE - Image processing and complex CRUD

### messages-stream
**Purpose:** Server-sent events for message streaming  
**Trigger:** HTTP  
**Features:** API for frontend, reads large data (message streams)  
**Classification:** 🟡 MIGRATE - Real-time message streaming

### send-invoice-template
**Purpose:** Sends invoices via WhatsApp templates or documents  
**Trigger:** HTTP  
**Features:** API for frontend, calls WhatsApp API, serves media  
**Classification:** 🟡 MIGRATE - WhatsApp API integration with media

### send-product-images
**Purpose:** Sends product images via WhatsApp  
**Trigger:** HTTP  
**Features:** API for frontend, downloads images, calls WhatsApp API  
**Classification:** 🟡 MIGRATE - Media processing and WhatsApp integration

### send-whatsapp-message
**Purpose:** Sends WhatsApp messages, templates, and media  
**Trigger:** HTTP  
**Features:** API for frontend, heavy logic, calls WhatsApp API, serves media  
**Classification:** 🟡 MIGRATE - Complex WhatsApp messaging logic

### upload-inventory-images
**Purpose:** Processes and uploads inventory images  
**Trigger:** HTTP  
**Features:** API for frontend, processes images  
**Classification:** 🟡 MIGRATE - Image processing pipeline

### upload-media
**Purpose:** Uploads media to WhatsApp and Supabase storage  
**Trigger:** HTTP  
**Features:** API for frontend, serves media, processes large data  
**Classification:** 🟡 MIGRATE - Media upload and processing

### upload-service-images
**Purpose:** Processes and uploads service images  
**Trigger:** HTTP  
**Features:** API for frontend, processes images  
**Classification:** 🟡 MIGRATE - Image processing pipeline

### whatsapp-webhook
**Purpose:** Handles incoming WhatsApp webhooks  
**Trigger:** Webhook  
**Features:** Processes messages, downloads media, calls external APIs  
**Classification:** 🟡 MIGRATE - Webhook processing with media handling

## 🔴 DEPRECATE (duplicate or unsafe)

*No functions identified for deprecation - all serve distinct purposes*

## Summary

- **🔵 KEEP:** 12 functions (48%) - Light CRUD and configuration operations
- **🟡 MIGRATE:** 13 functions (52%) - Media processing, WhatsApp integration, and heavy operations
- **🔴 DEPRECATE:** 0 functions (0%)

## Migration Priority

**High Priority (Media & WhatsApp Integration):**
1. whatsapp-webhook - Core messaging functionality
2. send-whatsapp-message - Primary messaging API
3. upload-media - Media upload pipeline
4. get-media-preview - Media serving

**Medium Priority (Image Processing):**
5. upload-inventory-images
6. upload-service-images
7. manage-services
8. send-product-images

**Low Priority (Data Operations):**
9. authenticated-messages-stream
10. messages-stream
11. get-analytics
12. delete-agent
13. send-invoice-template

## Migration Strategy

1. **Phase 1:** Migrate webhook and core messaging functions to reduce egress costs
2. **Phase 2:** Migrate media processing functions to optimize performance
3. **Phase 3:** Migrate remaining data-heavy operations

## Notes

- All functions currently serve distinct purposes with no duplicates identified
- Migration should prioritize functions with highest usage and cost impact
- Consider implementing caching and optimization before migration where possible
- Maintain backward compatibility during migration period