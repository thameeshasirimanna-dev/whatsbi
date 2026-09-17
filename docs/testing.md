# Agent Portal Style-Guide Verification & Manual Testing Guide

This document outlines the manual verification criteria, edge cases, and test protocols for the agent frontend overhaul in accordance with [`/docs/style-guide.md`](file:///c:/Github/whatsbi/docs/style-guide.md).

> [!IMPORTANT]
> **Strict Manual Execution**: The assistant never runs automated test scripts or terminal mutations. Follow the copy-pasteable verification commands and manual click-through steps below.

---

## 1. Automated Syntax & Type Verification

Before running browser manual verification, execute the TypeScript compilation check:

```bash
# In frontend directory
cd frontend
npx tsc --noEmit
```

Expected result: Clean exit with zero diagnostic errors across all decomposed agent components.

---

## 2. Style-Guide Compliance Checklist

All agent pages and subcomponents must strictly verify against these design tokens:

| Token Category | Rule Specification | Verification Check |
| :--- | :--- | :--- |
| **Primary Color** | Deep Forest `#16281D` | Page headers, active navigation, primary text |
| **Accent Color** | Vibrant Lime `#9FE870` | Primary action buttons, active toggles, badge accents |
| **Backgrounds** | Light Workspace `#F4F7F4`, Pure White `#FFFFFF` | Page canvas, cards, inputs |
| **Typography** | `Plus Jakarta Sans` | Body text, headings, modal titles |
| **Numerics / Codes** | `JetBrains Mono` (`font-mono`) | Currency amounts, dates, phone numbers, quantities |
| **Buttons** | **100% capsule buttons (`rounded-full`)** | Every trigger, save, cancel, export, filter pill |
| **Cards** | `rounded-[20px]` / `rounded-[24px]` | All KPI metrics, overview panels, table wrappers |
| **Modals & Drawers** | `rounded-3xl` container, blur backdrop `bg-[#16281D]/45 backdrop-blur-sm` | All creation wizards, edit dialogs, confirm popups |
| **Status Tokens** | 6px colored dot tokens (`#22C55E`, `#EF4444`, `#F59E0B`, `#71717A`, `#3B82F6`) | All order, appointment, broadcast, and team badges |

---

## 3. Page-by-Page Manual Test Criteria & Edge Cases

### 3.1 Invoices (`/agent/invoices`)
- **TC-INV-01 (KPI Cards)**: Verify 4 summary cards show formatted currency in `font-mono` (e.g., `LKR 15,200.00`).
- **TC-INV-02 (Toolbar Filters)**: Select status filter (`all`, `paid`, `pending`, `overdue`), search customer by name. Ensure capsule `rounded-full` controls respond smoothly.
- **TC-INV-03 (Payment Modal)**: Open Mark as Paid modal. Verify `rounded-3xl` geometry and capsule buttons. Test partial vs full payment calculations.
- **TC-INV-04 (Pagination & Mobile View)**: Test desktop table vs mobile card layout below `1024px`. Ensure responsive boundary `< 95vw` on mobile and `< 90vw` on desktop.

### 3.2 Orders (`/agent/orders` & `/agent/orders/:id`)
- **TC-ORD-01 (Bulk Actions Bar)**: Select 2+ order checkboxes. Floating bulk actions bar appears with capsule pill styling, counter badge in `font-mono`, and quick status change dropdown.
- **TC-ORD-02 (Order Analytics)**: Verify fulfillment breakdown and 6px dot status indicators.
- **TC-ORD-03 (Order Details)**: Navigate to `/agent/orders/:id`. Verify line-item calculations, customer metadata, and print/receipt layout.

### 3.3 Customers (`/agent/customers`)
- **TC-CUST-01 (Analytics Grid)**: Total contacts, active pipeline, and revenue metrics displayed in `font-mono`.
- **TC-CUST-02 (Bulk Selection & Broadcast Bridge)**: Select customers and click "Create Broadcast". Verify smooth redirect to `/agent/broadcasts` with customer IDs pre-selected in wizard.

### 3.4 Appointments (`/agent/appointments`)
- **TC-APT-01 (KPI Cards & Filters)**: Check Upcoming, Completed, and Cancelled count badges.
- **TC-APT-02 (Appointment Modals)**: Create, view, edit, and cancel appointments. Verify modal backdrop blur `bg-[#16281D]/45` and `rounded-3xl` containers.

### 3.5 Inventory & Services (`/agent/inventory` & `/agent/services`)
- **TC-INV-01 (Category Section)**: Add/edit item categories. Verify category pill filters.
- **TC-INV-02 (Item Modals)**: Create item with stock, SKU, and unit price in `font-mono`.
- **TC-SRV-01 (Services & Packages)**: Verify multi-tier package badges, duration chips, and delete confirmation dialog.

### 3.6 WhatsApp Templates (`/agent/templates`)
- **TC-TMP-01 (Live WhatsApp Preview)**: Open "Create Template". Type header, body text with `{{1}}`, `{{2}}` and watch the real-time WhatsApp chat bubble update dynamically.
- **TC-TMP-02 (Variable Validation)**: Ensure form enforces sample values for all dynamic placeholders before Meta Graph API submission.

### 3.7 WhatsApp Broadcasts (`/agent/broadcasts`)
- **TC-BC-01 (3-Step Campaign Wizard)**:
  - Step 1: Campaign name + Audience selection (All, By Segments, Manual Pick). Verify selected customer count badge updates immediately.
  - Step 2: Choose Approved Template vs Free-Form Text. If template selected, fill variable inputs `{{1}}`. If text selected, observe 24-hour window policy warning.
  - Step 3: Review summary card, verify Credit Estimation vs Agent Balance calculation. Launch campaign.
- **TC-BC-02 (Slide-out Details Drawer)**: Click "View Details" on campaign. Verify slide-out drawer displays recipient delivery status log, error reasons, and resend failed trigger.

### 3.8 Account Settings (`/agent/settings`)
- **TC-SET-01 (Inline Editable Fields)**: Edit Contact Name, Business Address, Business Email, Contact Phone, and Website. Verify Save/Cancel capsule pills.
- **TC-SET-02 (Branding & Document Upload)**: Test invoice background image upload + margin guide download. Test Company Overview Document upload with progress bar.
- **TC-SET-03 (Password Security)**: Change password with password visibility toggle and 8+ character validation.
- **TC-SET-04 (Team Management - Owner Only)**: Log in as agent owner. Add new team member via `rounded-3xl` modal. Delete member with confirm modal.

### 3.9 Performance Analytics (`/agent/analytics`)
- **TC-ANL-01 (Chartjs Visualizations)**: Verify Sales Overview (Doughnut), Revenue Updates (Bar), Yearly Orders (Line), and CRM Pipeline Funnel (Horizontal Bar).
- **TC-ANL-02 (Export Report)**: Click "Export Report" capsule button in top right. Verify browser print dialog triggers cleanly.

### 3.10 Conversations (`/agent/conversations`)
- **TC-CONV-01 (Empty Conversation Stability)**: Click on a conversation with 0 messages, or start a new conversation with a customer. Confirm the message view renders the centered "No messages yet" card with zero flickering, loop re-fetching, or skeleton fluttering.
- **TC-CONV-02 (Message View Scroll Stability)**: Scroll inside an empty or short chat history. Verify that `onLoadMoreMessages` does not fire prematurely when `scrollHeight <= clientHeight`.
- **TC-CONV-03 (Initial Message Delivery)**: Send a message in an empty conversation. Confirm immediate optimistic insertion and smooth scroll to bottom.
- **TC-CONV-04 (Empty Conversation List Ordering)**: Select an empty conversation from further down in the conversation list. Verify that selecting it does NOT change its timestamp to "Just now" and does NOT cause it to jump to the top of the conversation list.
- **TC-CONV-05 (Template View Layering)**: Open the Template Selection modal in Conversations. Click the View (Eye) icon on any template. Verify that the Template Preview modal opens in front of the selection modal (at `z-[110]`) with functional backdrop dismissal.

---

## 4. Page Layout, Spacing & Container Uniformity Verification

All agent pages now share the unified dashboard layout blueprint:
`className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans"`
and card/metric grids using `gap-3.5 sm:gap-4`.

| Page Route | Container Class Standard | Spacing Check |
| :--- | :--- | :--- |
| `/agent` (Dashboard) | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Benchmark |
| `/agent/customers` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Fixed crash (`DM` reference error), modularized |
| `/agent/invoices` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Standardized padding |
| `/agent/orders` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Standardized padding & metric grid gap |
| `/agent/orders/:id` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Standardized padding |
| `/agent/appointments` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Added outer padding & grid gap |
| `/agent/inventory` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Added outer padding & grid gap |
| `/agent/services` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Added outer padding & grid gap |
| `/agent/templates` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Added outer padding & grid gap |
| `/agent/broadcasts` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Normalized padding; removed top title; actions integrated in toolbar |
| `/agent/settings` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Normalized padding; removed redundant top title; direct 2-column grid |
| `/agent/analytics` | `w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4` | Normalized padding; removed top title; time ranges on left + Export on right |

