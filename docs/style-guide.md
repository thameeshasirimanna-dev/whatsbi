# WhatsBi Design System & Visual Specification

> **Live Interactive Component Reference**: [`/style-guide`](http://localhost:5173/style-guide)  
> **Aesthetic Register**: Deep Forest Dark (`#16281D`) + Vibrant Lime (`#9FE870`) + Light Workspace (`#F4F7F4` to `#FFFFFF`)  
> **Primary Typography**: `Plus Jakarta Sans` (Interface, Headings, Numerics & Controls) + `JetBrains Mono` (Technical)

---

## 1. Architectural Philosophy & Principles

The WhatsBi interface merges high-density operational telemetry with human-crafted ergonomics:
1. **Tri-Panel Ergonomics (Dock → Canvas → Inspector)**:
   - **Left Navigation Dock**: Ultra-compact vertical dock in deep forest dark (`#16281D`), housing the brand logo, circular active state shortcuts, and a tactile theme switcher.
   - **Central Telemetry Canvas**: Clean white/pale mint workspace (`#F4F7F4` to `#FFFFFF`) housing the top global search bar, greeting hero card, interactive telemetry charts (message throughput waves, AI token consumption curves, active chat sessions, and radial quota gauges), and automated workflow lists.
   - **Right Contextual Inspector**: Deep forest drawer (`#16281D`) providing deep contextual drilldowns, tenant agent profiles, broadcast campaign schedulers, and high-contrast lime calls-to-action.
2. **Rounded Enclosure System**:
   - Outer Application Frame: `border-radius: 40px` (or `2.5rem`), subtle border `1px solid rgba(0,0,0,0.06)`, deep soft elevation `0 24px 72px rgba(20,40,24,0.12)`.
   - Structural Panels (Dock & Inspector): `border-radius: 32px` (`2rem`).
   - Cards & Metric Containers: `border-radius: 20px` - `24px` (`1.25rem` - `1.5rem`).
   - Action Badges, Search Inputs & Buttons: `border-radius: 9999px` (full capsule pill).
3. **Impeccable Anti-Trope Guardrails**:
   - **No Emoji Icons as Functional Symbols**: All functional iconography uses official vector SVGs (`lucide-react`). Emojis are strictly banned from UI navigation, actions, and status items.
   - **No Side-Stripe 3px Borders**: Use full containment borders or background pill highlights.
   - **No Pill Badges for Section Titles**: Headings must be clean typographic elements without chips enclosing them.
   - **Fluid Boundaries**: Desktop viewports `max-w-[90vw] mx-auto`, mobile viewports `max-w-[95vw] mx-auto`.

---

## 2. Color Palette & Token System

### Forest Dark (Shell, Dock & Raised Deep Surfaces)

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `forest-950` | `#0B160E` | `rgb(11, 22, 14)` | Deepest background floor |
| `forest-900` | `#16281D` | `rgb(22, 40, 29)` | **Primary dock & inspector panel background** |
| `forest-850` | `#1E3527` | `rgb(30, 53, 39)` | Inspector cards, search inputs, schedule cells |
| `forest-800` | `#264432` | `rgb(38, 68, 50)` | Hover state on dark elements |
| `forest-700` | `#335841` | `rgb(51, 88, 65)` | Dark border dividers & inactive schedule rings |

### Vibrant Chartreuse / Lime Accent (High-Contrast Energy)

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `lime-300` | `#BEF264` | `rgb(190, 242, 100)` | Glowing hover highlights |
| `lime-400` | `#A3E635` | `rgb(163, 230, 53)` | Secondary lime accent |
| `lime-500` | `#9FE870` | `rgb(159, 232, 112)` | **Primary signature lime**: CTAs, active dock circle, scheduled campaign dates, active time slot |
| `lime-600` | `#84CC16` | `rgb(132, 204, 22)` | Active button pressed state |
| `lime-900` | `#1A2F10` | `rgb(26, 47, 16)` | Text on vibrant lime (`#0C1A0E` or `#16281D`) |

### Mint & Sage Workspaces (Light Surfaces & Soft Accents)

| Token | Hex | Usage |
|---|---|---|
| `mint-50` | `#F4F7F4` | Outer workspace background & page canvas |
| `mint-100` | `#ECFDF5` | Metric card badge background & subtle tints |
| `sage-300` | `#A1BAAE` | Muted secondary text inside dark panels |
| `sage-400` | `#8FA89B` | Inactive icon color inside dark dock |
| `sage-500` | `#648473` | Dark panel border accents & chart axes |

### Telemetry & Semantic Accents

| Token | Hex | Usage |
|---|---|---|
| `coral-500` | `#F87171` | Inbound message queue & active conversation dumbbell bars |
| `coral-600` | `#EF4444` | Critical alerts & delivery errors |
| `amber-400` | `#FBBF24` | Tenant satisfaction & AI rating badges (`★ 4.9`) |
| `sky-500` | `#38BDF8` | Inbound WhatsApp webhook & API connection telemetry |

---

## 3. Typography Hierarchy

### Font Families
- **Primary Typography (Interface, Headings & Numerics)**: `'Plus Jakarta Sans', sans-serif` (weights: 400, 500, 600, 700, 800)
- **Secondary Display Alternative**: `'Outfit', sans-serif`
- **Monospace (SKUs, IDs, Prefixes)**: `'JetBrains Mono', monospace`

### Typographic Scale

| Role | Font | Size | Weight | Leading | Tracking | Usage |
|---|---|---|---|---|---|---|
| `display-hero` | Plus Jakarta Sans | `1.625rem` (26px) | 800 | 1.15 | `-0.02em` | Welcome banner greeting |
| `panel-title` | Plus Jakarta Sans | `1.25rem` (20px) | 700 | 1.20 | `-0.01em` | Right inspector heading ("Tenant Agent Inspector") |
| `section-title` | Plus Jakarta Sans | `1.125rem` (18px) | 700 | 1.25 | `-0.01em` | "Recent Telemetry", "Automated Workflows" |
| `kpi-metric` | Plus Jakarta Sans | `1.875rem` (30px) | 800 | 1.00 | `-0.02em` | Big chart numerics ("90", "4000") |
| `body-base` | Plus Jakarta Sans | `0.875rem` (14px) | 500 | 1.50 | `0` | Standard card text & list items |
| `caption-sm` | Plus Jakarta Sans | `0.75rem` (12px) | 500 | 1.40 | `0` | Chart axes, timestamps, subtitles |
| `badge-pill` | Plus Jakarta Sans | `0.6875rem` (11px) | 700 | 1.00 | `0.02em` | Tooltip tags ("90 msg/s", "6M tokens") |

---

## 4. Spacing & Geometry Scale

| Token | Dimension | Application |
|---|---|---|
| `radius-outer-frame` | `40px` / `44px` | Outer dashboard shell frame |
| `radius-panel` | `32px` | Left navigation rail dock & right agent inspector |
| `radius-card` | `20px` - `24px` | Welcome hero banner, telemetry chart cards |
| `radius-pill` | `9999px` | Search bar, export button, workflow action pills, CTA button |
| `padding-rail` | `28px 14px` (`py-7 px-3.5`) | Left navigation dock interior padding |
| `padding-inspector` | `24px - 28px` (`p-6 md:p-7`) | Right inspector drawer interior padding |
| `padding-card` | `20px - 24px` (`p-5 md:p-6`) | Telemetry metric cards interior padding |
| `gutter-columns` | `20px` (`gap-5`) | Spacing between dock, canvas, and inspector |

---

## 5. Core Layout Primitives

### 1. Navigation Dock (Left Rail)
- **Geometry**: Compact rounded dock (`width: 76px`, `border-radius: 32px`, `background: #16281D`).
- **Brand Mark**: Top circular logo badge (`width: 48px`, `height: 48px`, `background: #203628`, border `1px solid rgba(255,255,255,0.1)`, 4 vibrant lime dots `#9FE870`). Keeps the non-page brand mark visually distinct from the active page indicator.
- **Active Nav Item**: Rounded circular container (`width: 48px`, `height: 48px`, `border-radius: 9999px` / `rounded-full`, `background: #9FE870`, dark icon `#16281D`, shadow `0 4px 14px rgba(159,232,112,0.35)`).
- **Inactive Nav Items**: Subtle circular buttons (`width: 44px`, `height: 44px`, icon color `#8FA89B`, hover `rgba(255,255,255,0.08)`).
- **Theme Switcher**: Pill capsule containing Sun (in `#9FE870` circle) and Moon (in `#16281D` circle).

### 2. Global Search & Hero Card
- **Search Pill**: Capsule input (`height: 44px`, `border-radius: 9999px`, `background: #FFFFFF`, border `1px solid #EAEAEA`, left search icon, right mic & notification triggers).
- **Hero Card**: Deep forest banner (`border-radius: 24px`, `background: #16281D`, `color: #FFFFFF`, padding `20px 24px`).
  - Title: `"Welcome back, Liam Gallagher!! 👋"`
  - Subtitle: `"Multi-tenant WhatsApp Cloud API & AI routing are active."`

### 3. Telemetry Visualizations (2x2 Grid)
1. **Message Throughput (Traffic Spike Waveform)**: Header with `"Hourly ▾"`, smooth SVG traffic wave, floating badge `"90 msg/s"`, numeric `"90 msg/s"`.
2. **AI Token Consumption (Token Volume Area Curve)**: Header with `"Monthly ▾"`, gradient area curve showing DeepSeek token usage, tooltip badge `"6M tokens"`, month labels.
3. **Active Chat Sessions (Session Barbell Dumbbells)**: Header with `"Hourly ▾"`, coral dumbbell bars (`#F87171`), numeric `"4000 sessions"`.
4. **AI Capacity & Quota Gauge (Radial Speedometer Arc Gauge)**: Header with `"Monthly ▾"`, 180° radial arc, active lime capsule `"65% used"`, quota tags (45%, 55%, 65%, 75%, 85%).

### 4. Contextual Inspector (Right Panel)
- **Geometry**: Dark forest panel (`width: 310px`, `border-radius: 32px`, `background: #16281D`, padding `24px`).
- **Profile**: Avatar (`48×48px` with `#9FE870` ring), user badges (`+100k Messages`, `99.9% Uptime`, `★ 4.9`).
  - Agent Name: `"Apex Customer AI"`
  - Domain: `"DeepSeek V3 • WhatsApp Auto-Responder"`
- **Campaign Scheduler (Broadcast Day Picker)**:
  - 7-day weekday headers, selected date day `17` in vibrant lime circle (`#9FE870`).
  - Legend: `Scheduled` (green dot), `Broadcasting` (muted dot), `Idle` (dark dot).
- **Broadcast Time Slots**: Capsules (`09:00 AM`, `10:00 AM`, active `11:00 AM` in `#9FE870`).
- **Primary CTA**: Capsule `"Deploy Campaign"` (`height: 48px`, `background: #9FE870`, text `#16281D`, font-bold).

---

## 6. Button Hierarchy, Affordances & Interactive States

### Button Variants

| Variant | Background | Border | Text | Hover State | Usage |
|---|---|---|---|---|---|
| **Primary Lime** | `#9FE870` | None | `#16281D` (Bold) | `bg-[#8CE05A]` + lime shadow | Main page actions ("Deploy Campaign", "Save Changes") |
| **Secondary Forest** | `#16281D` | None | `#FFFFFF` (Bold) | `bg-[#203628]` | Alternative actions ("Add Tenant", "Apply Filters") |
| **Soft Mint** | `#F4F7F4` | `1px solid rgba(0,0,0,0.05)` | `#16281D` | `bg-[#E8ECE8]` | Secondary controls, dropdown toggles |
| **Outline / Ghost** | Transparent | `1.5px solid #E4E4E7` | `#52525B` | `bg-black/5` or `border-[#16281D]` | Secondary actions ("Cancel", "Export") |
| **Destructive** | `#FFF1F2` | `1px solid #FECDD3` | `#E11D48` | `bg-[#FFE4E6]` | Destructive operations ("Delete Tenant", "Revoke Token") |

### Button Sizing Scale

- **Small (`sm`)**: `height: 32px` (`h-8`), `padding: 0 12px` (`px-3`), `font-size: 0.75rem` (`text-xs`), icon `size={12}`.
- **Medium (`md`)**: `height: 40px` (`h-10`), `padding: 0 16px` (`px-4`), `font-size: 0.8125rem` (`text-[13px]`), icon `size={14}`.
- **Large (`lg`)**: `height: 48px` (`h-12`), `padding: 0 24px` (`px-6`), `font-size: 0.875rem` (`text-sm`), icon `size={16}`.
- **Icon Only**: `32×32px` (micro), `40×40px` (toolbar), `48×48px` (nav dock), always `border-radius: 9999px` (`rounded-full`).

### Button States

1. **Default**: Crisp border/background with stable typography.
2. **Hover**: Smooth color transition (`duration-150`), subtle upward translation (`-translate-y-0.5`), glowing shadow on lime buttons.
3. **Pressed (Active)**: Scale down (`active:scale-[0.98]`).
4. **Disabled**: `opacity-45 pointer-events-none cursor-not-allowed`.
5. **Loading**: Replaces leading icon with circular spinner (`<Loader2 className="animate-spin" />`), label switches to present participle ("Saving...").

---

## 7. Status Badges, System Indicators & Pill Tags

### Operational Status Badges

| Status | Dot Token | Badge Background | Badge Text | Usage |
|---|---|---|---|---|
| **Active / Online** | `#22C55E` | `#F0FDF4` | `#15803D` | Active tenant, healthy webhook, connected agent |
| **Warning / Low** | `#F59E0B` | `#FFFBEB` | `#92400E` | Low credit balance, high latency, queue backlog |
| **Critical / Failed** | `#EF4444` | `#FFF1F2` | `#E11D48` | Meta API error, failed invoice, disconnected agent |
| **Neutral / Draft** | `#71717A` | `#F4F4F5` | `#52525B` | Unsaved draft, offline agent, archived record |

### Value Badges & Telemetry Tags

- **Lime Telemetry Tag**: `background: #9FE870`, `text: #16281D`, font-bold, radius `9999px`, padding `4px 10px` (e.g. `90 msg/s`, `6M tokens`, `65% used`).
- **Dark Inspector Metadata Badges**:
  - Message Volume Badge: `background: #203628`, `text: #9FE870`, icon `MessageSquare` (`+100k Messages`).
  - System Uptime Badge: `background: #2E3C2B`, `text: #D9F99D`, icon `Zap` (`99.9% Uptime`).
  - Rating Badge: `background: #3A4E31`, `text: #A3E635`, icon `Star` fill (`★ 4.9 (40 Reviews)`).


---

## 8. Card Anatomy & Structural Containers

### Card Architecture
Every card consists of:
1. **Header Zone**: Icon badge or category label on the left; action menu or filter pill on the right.
2. **Content Canvas**: Primary numeric readout, SVG chart, or structured list.
3. **Footer Zone**: Optional time stamp, legend indicators, or inline CTA.

### Container Surface Types
- **Light Workspace Card**: `background: #FFFFFF`, border `1px solid #EAEAEA`, `border-radius: 20px` - `24px`, padding `20px` - `24px`, shadow `0 2px 6px rgba(0,0,0,0.05)`.
- **Dark Inspector Card**: `background: #16281D` or `#1E3527`, border `1px solid rgba(255,255,255,0.08)`, `border-radius: 24px` - `32px`, padding `20px` - `28px`.
- **Soft Mint Card**: `background: #F4F7F4`, border `1px solid #E4E8E4`, `border-radius: 16px` - `20px`.

---

## 9. Navigation Systems, Segmented Controls & Breadcrumbs

### Segmented Capsule Switch
- **Track**: `background: #E8ECE8`, padding `4px`, border-radius `9999px`, border `1px solid rgba(0,0,0,0.05)`.
- **Active Segment**: `background: #16281D`, `color: #FFFFFF`, font-weight `700`, shadow `0 1px 2px rgba(0,0,0,0.1)`.
- **Inactive Segment**: `color: #52525B`, hover `color: #16281D`.

### Breadcrumbs
- Typography: `font-size: 0.75rem` (`text-xs`), medium weight.
- Divider: `ChevronRight size={12} text-[#A1A1AA]`.
- Active crumb: `font-bold text-[#16281D]`.

---

## 10. Form Controls & Inputs

### Text Inputs & Textareas
- **Base Input**: Background `#FFFFFF` or `#FAFAFA`, border `1.5px solid #E4E4E7`, border-radius `12px` or `9999px` for search pills, padding `10px 14px`, font size `0.875rem` (14px).
- **Focus State**: Border `1.5px solid #9FE870`, box-shadow `0 0 0 3px rgba(159, 232, 112, 0.25)`.
- **Error State**: Background `#FFF1F2`, border `1.5px solid #F43F5E`, box-shadow `0 0 0 3px rgba(244, 63, 94, 0.15)`.
- **Dark Surface Inputs**: Inside `#16281D` panels, inputs use background `#203628`, border `1px solid rgba(255,255,255,0.08)`, text `#FFFFFF`, placeholder `#8FA89B`.

### Select Menus & Custom Dropdowns
- **Form Select Trigger**:
  - Height: `40px` (`h-10`), border-radius: `12px` (`rounded-xl`), padding: `0 14px`.
  - Base State: Background `#FAFAFA`, border `1.5px solid #E4E4E7`, text `#16281D`, font-size `0.8125rem` (13px), font-weight `500`.
  - Focus / Open State: Border `1.5px solid #9FE870`, box-shadow `0 0 0 3px rgba(159, 232, 112, 0.25)`.
  - Indicator: `ChevronDown size={14}` on right, animating with `transform rotate-180` when open.
- **Flyout Popover Menu**:
  - Container: Background `#FFFFFF`, border `1px solid #EAEAEA`, border-radius `16px`, padding `6px`, box-shadow `0 12px 36px rgba(20, 40, 24, 0.14)`, z-index `30` (`z-dropdown`).
  - Menu Items: Padding `8px 12px`, border-radius `10px`, font-size `0.75rem` (12px), font-weight `600`, color `#16281D`.
  - Item Hover: Background `#F4F7F4`, color `#16281D`.
  - Selected Item: Background `#F0FDF4`, color `#15803D`, right checkmark SVG (`Check size={13} strokeWidth={2.6}`).
- **Filter Pill Dropdowns (Telemetry / Toolbar Tag)**:
  - Height: `32px` (`h-8`), border-radius: `9999px` (`rounded-full`), background `#F4F7F4`, border `1px solid rgba(0,0,0,0.06)`, padding `0 12px`, font-size `0.6875rem` (11px), font-weight `700`, text `#16281D`.
- **Dark Surface Dropdown (Inspector Panels)**:
  - Trigger: Background `#203628`, border `1px solid rgba(255,255,255,0.1)`, text `#FFFFFF`, chevron `#8FA89B`.
  - Menu: Background `#16281D`, border `1px solid rgba(255,255,255,0.1)`, item hover `#203628`, selected text `#9FE870`.

### Toggle Switches
- **Track**: Dimensions `42×24px`, border-radius `9999px`. Inactive: `#E4E4E7` (or `#203628` on dark). Active: `#9FE870` (or `#22C55E`).
- **Thumb**: Dimensions `18×18px`, border-radius `50%`, color `#FFFFFF`, shadow `0 1px 3px rgba(0,0,0,0.2)`. Transitions smoothly via `transform: translateX(18px)`.

### Checkboxes
- **Checked**: Dimensions `18×18px`, background `#9FE870` (or `#22C55E`), border `2px solid #9FE870`, white check SVG icon.
- **Indeterminate**: Background `#9FE870`, horizontal white dash icon.
- **Unchecked**: Dimensions `18×18px`, background `#FFFFFF`, border `2px solid #D4D4D8`, border-radius `5px`.

---

## 11. Data Tables & Record Management

- **Toolbar**: Search filter input, view toggles (grid/list), and primary action pill buttons.
- **Table Header**: Background `#F8FAF8`, border bottom `1px solid #EBEBEB`, typography `0.6875rem` (11px), uppercase, `letter-spacing: 0.08em`, font weight `700`, color `#52525b`. Includes "Select All" checkbox.
- **Table Rows**: Standard height `52px`, font size `0.8125rem` (13px), hover highlight `background: #FAFFFE`.
- **Row Selection**: Checkbox column with `#9FE870` / `#22C55E` accent; selected rows highlight with `#F0FDF4` background tint.
- **Floating Bulk Actions Bar**: Docked/floating dark pill bar (`background: #16281D`, border `1px solid rgba(255,255,255,0.1)`, shadow `0 12px 36px rgba(22,40,29,0.25)`) displaying selected count badge and batch operations (Mark Paid, Export, Delete, Clear).
- **Pagination Controls**: Active page `#9FE870` with `#16281D` text; inactive pages `#FFFFFF` with border `1px solid #E4E4E7`.

---

## 12. Modal Dialogs & Contextual Drawers

### Modal Dialogs
- **Backdrop Overlay**: Background `rgba(0, 0, 0, 0.5)`, backdrop-filter `blur(4px)`, z-index `60`.
- **Modal Container**: Border-radius `24px` (`1.5rem`), background `#FFFFFF`, border `1px solid #EAEAEA`, shadow `0 24px 64px rgba(0,0,0,0.16)`, max-width `540px` (standard) or `720px` (wide).
- **Header**: Title in `Plus Jakarta Sans` 700 bold, close button in circular soft frame (`hover:bg-[#F4F7F4]`).
- **Footer**: Cancel ghost/soft button + primary action pill button. Danger actions use `#F43F5E` red.

### Slide-Over Drawers (Inspector Panels)
- **Geometry**: Slides in from right, width `340px` - `420px`, background `#16281D` (dark) or `#FFFFFF` (light), full height `100vh`, z-index `50`.
- **Header**: Breadcrumb/title with close button, body scrollable area, pinned footer with high-contrast primary CTA.

---

## 13. Alerts, Banners & Toast Notifications

| Variant | Background | Border | Text | Icon Token | Usage |
|---|---|---|---|---|---|
| **Success** | `#F0FDF4` | `#BBF7D0` | `#15803D` | `CheckCircle2` | Successful save, payment received, message sent |
| **Warning** | `#FFFBEB` | `#FDE68A` | `#92400E` | `AlertTriangle` | Low credits, maintenance mode active, expiring token |
| **Danger** | `#FFF1F2` | `#FECDD3` | `#E11D48` | `AlertCircle` | Failed delivery, validation errors, unauthorized access |
| **Info** | `#F0F9FF` | `#BAE6FD` | `#0369A1` | `Info` | Webhook guidance, system updates, new feature notices |

*Toast notifications animate in with `translateY(-8px) scale(0.98)` to `translateY(0) scale(1)` over 200ms with auto-dismiss after 4000ms.*

---

## 14. Loading, Feedback & Empty States

- **Skeleton Shimmers**: Linear gradient shimmer moving from `#E8F5E9` to `#C8E6C9` over `1.4s infinite linear`, border-radius `8px`.
- **Spinners**: Circular 2px vector SVG spinner rotating at `0.9s linear infinite` (`text-[#9FE870]` or `text-[#059669]`).
- **Typing Pulse Indicator**: 3-dot staggered bounce (`animation: bounce 0.6s infinite alternate`) for agent/AI chatbot drafting states.
- **Empty States**: Centered illustration or icon inside a soft green circle (`width: 56px`, `height: 56px`, `background: #ECFDF5`), clear title, helper subtitle, and primary call-to-action button.

---

## 15. Iconography Guidelines & Anti-Trope Directives

- **Primary Vector Library**: `lucide-react`.
- **Strict Emoji Ban**: Functional navigation symbols, status indicators, and buttons MUST NEVER use raw emoji characters (`🔥`, `🚀`, `💡`, `🏥`, `💉`).
- **Stroke Width**: Standard `2px` (or `2.4px` for micro icons ≤ 14px).
- **Icon Sizing Grid**:
  - Micro (`12px` - `14px`): Badges, tooltips, inline stats.
  - Action / Field (`16px` - `18px`): Buttons, search inputs, table actions.
  - Card & Section (`20px` - `22px`): Section titles, alert banners, metric headers.
  - Rail & Navigation (`24px`): Left dock icon shortcuts.

---

## 16. Accessibility (WCAG AAA), Focus Rings & Usability

- **High-Contrast Validation**: The signature pairing of Deep Forest `#16281D` text on Vibrant Lime `#9FE870` yields an **11.5:1** contrast ratio, surpassing the WCAG AAA requirement of 7:1.
- **Keyboard Navigation**: All interactive elements (buttons, inputs, toggles, row selections) must provide visible focus indicators: `focus-visible:ring-2 focus-visible:ring-[#9FE870] focus-visible:ring-offset-2 outline-none`.
- **Minimum Touch Targets**: All touch targets for tablet and mobile devices must be at least `44×44px`.
- **Screen Reader Support**: Use `aria-label` on icon-only buttons, `aria-expanded` on dropdowns, and `aria-checked` on checkboxes/toggles.

---

## 17. Motion System, Timing Tokens & Micro-Interactions

WhatsBi relies on physical, responsive motion tokens to create high-velocity tactile feedback while preserving operational calmness.

### 1. Duration & Timing Tokens

| Token | Milliseconds | Usage | CSS Utility |
|---|---|---|---|
| `motion-fast` | `150ms` | Button hover, icon color shifts, checkbox ticks, tooltips | `duration-150` |
| `motion-normal` | `250ms` | Dropdowns, alert banners, accordion expansions, tabs | `duration-250` |
| `motion-deliberate` | `350ms` | Slide-over inspector drawers, modal reveals, backdrop scrims | `duration-350` |
| `motion-slow` | `500ms` | Layout reorganizations, multi-card container resizes | `duration-500` |

### 2. Cubic-Bezier Easing Scale

| Easing Token | Bezier Definition | Characteristics | Usage |
|---|---|---|---|
| **Snappy Ease-Out** | `cubic-bezier(0.16, 1, 0.3, 1)` | High-velocity start with abrupt, smooth deceleration | **Primary UI default**: Modals, drawers, dropdowns, cards |
| **Tactile Spring** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Physics-calibrated slight overshoot | Toggle switches, star rating clicks, badge pop-ins |
| **Standard Smooth** | `cubic-bezier(0.4, 0, 0.2, 1)` | Balanced entry and exit acceleration | Color transitions, opacity shifts, border glows |
| **Linear** | `linear` | Constant speed | Vector spinners (`animate-spin`), skeleton sweeps |

### 3. Tactile Micro-Interactions

- **Card Hover Elevation**:
  ```css
  /* Hover lift with soft elevation */
  .card-interactive {
    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease-out;
  }
  .card-interactive:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(20, 40, 24, 0.10);
  }
  ```
- **Button Tactile Compression**:
  ```css
  /* Immediate physical press feeling */
  .btn-tactile {
    transition: transform 100ms ease-out;
  }
  .btn-tactile:active {
    transform: scale(0.96);
  }
  ```
- **Chevron Indicator Flip**: Rotates 180° upon trigger expansion (`transition-transform duration-200 ease-out transform rotate-180`).
- **Signature Lime Pulse**: Glowing pulse ring on confirmation (`ring-4 ring-[#9FE870]/40 shadow-[0_0_24px_rgba(159,232,112,0.6)]`).

### 4. Continuous Operational Telemetry Loops

- **Radar Beacon Ping**: Expanding concentric ring (`animate-ping` with `duration: 1.5s` and `opacity: 0.6`) indicating active tenant webhook streaming.
- **Throughput Traffic Ping**: Periodic vector pulse (`animation: pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite`) representing live WhatsApp Cloud API message throughput spikes (90 msg/s).
- **AI Drafting 3-Dot Stagger**: 3 circular dots bouncing vertically with staggered delays (`0s`, `0.18s`, `0.36s`) representing DeepSeek AI inference and agent drafting.
- **Shimmer Sweep**: Continuous diagonal highlight gradient moving infinitely from left to right (`animation: shimmer 1.4s linear infinite`).

### 5. Choreographed Entrance Transitions

- **Modal Dialogs**: `animate-in fade-in zoom-in-90 duration-300 ease-out`
- **Slide-Over Contextual Drawers**: `animate-in slide-in-from-right duration-350 ease-out`
- **Toast Notifications**: `animate-in fade-in slide-in-from-top-2 duration-200 ease-out`
- **Select Menu Popovers**: `animate-in fade-in zoom-in-95 duration-150 ease-out`

### 6. Accessibility & Reduced Motion (`prefers-reduced-motion`)

All animation sequences MUST respect user system accessibility preferences:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
*When reduced motion is requested, eliminate all spatial translations (`translate-x`, `translate-y`, `scale`) and fallback to instantaneous opacity crossfades.*

---

## 18. Elevation, Shadows & Z-Index Scale

### Shadow System
- `shadow-xs`: `0 1px 2px rgba(0, 0, 0, 0.04)` (small buttons, micro badges)
- `shadow-sm`: `0 2px 6px rgba(0, 0, 0, 0.05)` (cards, search pills)
- `shadow-md`: `0 4px 16px rgba(0, 0, 0, 0.08)` (dropdowns, popovers)
- `shadow-lg`: `0 12px 32px rgba(0, 0, 0, 0.12)` (slide-over drawers, sticky bars)
- `shadow-xl`: `0 24px 64px rgba(22, 40, 29, 0.14)` (dashboard outer shell, modal dialogs)
- `shadow-lime`: `0 4px 16px rgba(159, 232, 112, 0.35)` (primary CTA lime button glow)

### Semantic Z-Index Hierarchy
- `z-dropdown`: `30`
- `z-sticky`: `40`
- `z-drawer`: `50`
- `z-modal-backdrop`: `60`
- `z-modal`: `70`
- `z-toast`: `80`

---

## 19. Responsive Layout Bounds

- **Desktop Viewports (≥ 1280px)**: 3-column layout (Dock: 76px, Workspace: 1fr, Inspector: 330px), maximum layout container width `90vw` (`max-width: 90vw; margin: 0 auto;`).
- **Laptop / Tablet Viewports (768px - 1279px)**: 2-column or stacked layout with collapsible inspector, maximum layout container width `95vw`.
- **Mobile Viewports (< 768px)**: Single-column layout with floating mobile nav toggle, edge gutters `12px` - `16px`, maximum layout container width `95vw`.

---

## 20. Authentication Portal Architecture

- **Canvas & Tone**: Soft Light Architectural Canvas (`#F4F7F4`) with delicate dot matrix (`opacity 0.035`, 24px pitch).
- **Enclosure Structure**: Split-Architecture Card (`rounded-2xl sm:rounded-3xl`, `#E5E7EB` border, elevation `shadow-[0_20px_60px_-15px_rgba(20,40,24,0.07)]`).
- **Showcase Panel (`lg:w-5/12`)**: Deep Forest `#16281D` surface with interactive tabbed feature showcase (`Customer Chat` WhatsApp inquiry simulation & `Key Features` 24/7 auto-inquiries, automated bookings, and contact management). Zero mentions of DeepSeek or backend infrastructure (no latencies, SLAs, cloud APIs, or server telemetry).
- **Form Surface (`lg:w-7/12`)**: Pure white `#FFFFFF` interior with high-contrast inputs (`#F9FAFB` transitioning to `#FFFFFF`), Caps Lock detection indicator, custom accessible checkbox, and signature lime capsule CTA button (`#9FE870`).
- **Brand Guardrail**: Strictly unified under "Agent Portal" / "Workspace Login", with zero mentions of "Super Admin" across client-facing authentication surfaces. Zero mentions of DeepSeek or internal infrastructure across all agent-facing views.




