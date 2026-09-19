# Biz Agentz Design System & Visual Specification

> **Live Interactive Component Reference**: [`/style-guide`](http://localhost:5173/style-guide)  
> **Aesthetic Register**: Deep Forest Dark (`#16281D`) + Vibrant Lime (`#9FE870`) + Light Workspace (`#F4F7F4` to `#FFFFFF`)  
> **Primary Typography**: `Plus Jakarta Sans` (Interface, Headings, Numerics & Controls) + `JetBrains Mono` (Technical)

---

## 1. Architectural Philosophy & Principles

The Biz Agentz interface merges high-density operational telemetry with human-crafted ergonomics:
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
| `radius-outer-frame` | `36px` / `44px` (`rounded-[36px] md:rounded-[44px]`) | Outer dashboard shell frame |
| `radius-panel` | `32px` (`rounded-[32px]`) | Left navigation rail dock & right agent inspector drawer |
| `radius-card` | `20px` / `24px` (`rounded-[20px]` / `rounded-[24px]`) | Hero banner, telemetry cards, automation list cards |
| `radius-modal` | `24px` / `32px` (`rounded-3xl`) | Centered modal containers, custom popovers (`rounded-2xl`) |
| `radius-capsule` | `9999px` (`rounded-full`) | **All buttons**, select dropdowns & action menus, status badges, search pills, time filter tags |
| `padding-rail` | `28px 14px` (`py-7 px-3.5`) | Left navigation rail dock interior padding |
| `padding-inspector` | `24px - 28px` (`p-6 md:p-7`) | Right campaign inspector drawer interior padding |
| `padding-card` | `20px - 24px` (`p-5 md:p-6`) | Telemetry metric cards & modal containers interior padding |
| `gutter-columns` | `20px` (`gap-5`) | Spacing between dock, canvas, and inspector |

---

## 5. Core Layout Primitives

### 1. Navigation Rail (Left Dock)
- **Geometry**: Compact rounded rail (`w-[74px] md:w-[80px]`, `rounded-[32px]`, `bg-[#16281D]`, `py-7 px-3.5`).
- **Brand Mark**: Top circular diamond logo badge (`w-12 h-12 rounded-full bg-[#203628] border border-white/10`, 4 lime dots `w-1.5 h-1.5 rounded-full bg-[#9FE870]`).
- **Active Nav Item**: `w-12 h-12 rounded-full bg-[#9FE870] text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.35)]`.
- **Inactive Nav Items**: `w-12 h-12 rounded-full text-[#8FA89B] hover:text-white hover:bg-white/5 transition-all`.
- **Theme Switcher Capsule**: `bg-[#0E1C13] p-1.5 rounded-full gap-1 border border-white/5` with `w-8 h-8 rounded-full` buttons (`bg-[#9FE870] text-[#16281D]` when active, `text-[#8FA89B] hover:text-white` when inactive).

### 2. Global Search, Hero & Automations
- **Search Pill**: `w-full h-12 bg-white rounded-full px-5 border border-[#EAEAEA] shadow-[0_1px_4px_rgba(0,0,0,0.02)]` with left `Search size={17}` and right circular actions (`Mic`, `Bell`).
- **Hero Banner**: `w-full bg-[#16281D] text-white rounded-[24px] p-6 md:p-7 relative overflow-hidden shadow-sm` with background radial glow `radial-gradient(circle, #9FE870 0%, rgba(22,40,29,0) 70%)`.
- **Automations List**: Header with `w-8 h-8 rounded-full bg-[#9FE870] text-[#16281D]` plus CTA. Cards: `bg-white rounded-[20px] p-3 md:px-4 md:py-2.5 border border-[#EAEAEA] shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:border-[#9FE870]`, icon ring `w-9 h-9 rounded-full bg-[#E8F8EE] text-[#059669] group-hover:bg-[#9FE870] group-hover:text-[#16281D]`.

### 3. Telemetry Visualizations (2x2 Grid)
1. **Message Throughput**: Header with `"Hourly ▾"` filter tag (`inline-flex items-center gap-1 text-[11px] font-semibold text-[#16281D] bg-[#F4F7F4] px-3 py-1 rounded-full border border-black/5 hover:bg-[#EAEFEA]`), smooth SVG wave (`stroke="#9FE870" strokeWidth="2.5"`), floating badge `bg-[#9FE870] text-[#16281D] rounded-full px-2.5 py-0.5 font-bold text-[10px]` ("90 msg/s"), numeric `90 msg/s`.
2. **AI Token Usage**: Header with `"Monthly ▾"` tag, linear-gradient area fill (`#9FE870` 40% to 2%), peak circle markers, floating badge `"6M tokens"`, month axis.
3. **Active Conversations**: Header with `"Hourly ▾"` tag, 8 coral barbell dumbbell lines (`stroke="#F87171" strokeWidth="3.5"`) with rounded circle caps (`#EF4444`), numeric `4000 chats`.
4. **AI Model Quota**: Header with `"Monthly ▾"` tag, 180° speedometer radial arc gauge with highlighted lime ticks, central quota badge `bg-[#9FE870] text-[#16281D] px-3.5 py-1 rounded-xl font-extrabold text-[13px]` ("65% used"), radial percentages (45%, 55%, 65%, 75%, 85%).

### 4. Campaign Inspector Drawer (Right Panel)
- **Geometry**: Dark forest panel (`w-full xl:w-[330px] self-stretch bg-[#16281D] rounded-[32px] p-6 md:p-7 text-white shadow-sm`).
- **Search Bar**: `bg-[#203628] rounded-full px-3.5 py-1.5 border border-white/5` with filter button `w-7.5 h-7.5 rounded-full bg-[#9FE870] text-[#16281D]`.
- **Profile Card**: Avatar `w-12 h-12 rounded-full border-2 border-[#9FE870]`, profile tags (`+100k Msgs` in `#203628`/`#9FE870`, `99.9% Uptime` in `#2E3C2B`/`#D9F99D`, `★ 4.9 (40)` in `#3A4E31`/`#A3E635`).
- **Schedule Day Picker**: 7-day grid, selected date `w-7.5 h-7.5 rounded-full bg-[#9FE870] text-[#16281D] font-extrabold shadow-[0_2px_8px_rgba(159,232,112,0.4)]`. Legend with lime, white/40, and white/10 dots.
- **Broadcast Time Slots**: Pills `px-3.5 py-1.5 rounded-full text-xs font-bold` (`bg-[#9FE870] text-[#16281D]` active, `bg-[#203628] text-white/80` inactive).
- **Primary CTA**: `w-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-sm py-3.5 rounded-full shadow-[0_4px_16px_rgba(159,232,112,0.35)]`.

---

## 6. Button Hierarchy, Affordances & Interactive States

> **Strict Geometry Directives**: Per `/style-guide`, **ALL standard buttons and action triggers use `rounded-full` (capsule pill / `border-radius: 9999px`)**. Standard buttons must NEVER use `rounded-xl`, `rounded-lg`, or square corners.

### Button Variants

| Variant | Exact Tailwind Class Specification | Usage |
|---|---|---|
| **Primary Lime** | `bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2.5 px-4 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all` | Main CTAs & primary actions ("Deploy Campaign", "Save & Verify") |
| **Secondary Forest** | `bg-[#16281D] hover:bg-[#203628] active:scale-[0.98] text-white font-bold text-xs py-2.5 px-4 rounded-full shadow-xs cursor-pointer border-0 transition-all` | Alternative dark workflows ("Tenant Settings", "Launch Inspector") |
| **Soft Mint** | `bg-[#F4F7F4] hover:bg-[#E8ECE8] active:scale-[0.98] text-[#16281D] font-bold text-xs py-2.5 px-4 rounded-full border border-black/5 cursor-pointer transition-all` | Utility, filters & export actions ("Export CSV", time pills) |
| **Ghost / Outline** | `bg-transparent hover:bg-black/5 active:scale-[0.98] text-[#52525B] font-bold text-xs py-2.5 px-4 rounded-full border border-[#E4E4E7] cursor-pointer transition-all` | Secondary actions, dismissals & modal backout ("Cancel", "Dismiss") |
| **Destructive** | `bg-[#FFF1F2] hover:bg-[#FFE4E6] active:scale-[0.98] text-[#E11D48] font-bold text-xs py-2.5 px-4 rounded-full border border-[#FECDD3] cursor-pointer transition-all` | Irreversible operations ("Delete Record", "Revoke Token") |

### Button Sizing Scale

- **Small (`sm` / 32px)**: `h-8 px-3 rounded-full text-[11px] font-bold`, icon `size={12-13}`.
- **Medium (`md` / 40px)**: `h-10 px-4 rounded-full text-xs font-bold`, icon `size={14}`.
- **Large (`lg` / 48px)**: `h-12 px-6 rounded-full text-sm font-bold`, icon `size={15-16}`.
- **Icon-Only**: `w-8 h-8 rounded-full` (micro/utility), `w-10 h-10 rounded-full` (toolbar), `w-12 h-12 rounded-full` (dock/action).

### Interactive States

1. **Hover Elevation**: Smooth color shift with `-translate-y-0.5` or `shadow-[0_4px_14px_rgba(159,232,112,0.35)]`.
2. **Pressed (Active)**: Immediate physical tactile compression: `active:scale-[0.98]` or `active:scale-95`.
3. **Loading State**: Button remains `rounded-full` while replacing icon with `<Loader2 size={14} className="animate-spin text-[#9FE870]" />` and active text ("Syncing...", "Saving...").
4. **Disabled State**: `bg-[#E4E4E7] text-[#A1A1AA] font-bold text-xs h-10 px-4 rounded-full border-0 cursor-not-allowed opacity-60 pointer-events-none`.

### Button Dropdowns & Menu Triggers
All dropdown menus and select controls in Biz Agentz share the exact button token system and capsule geometry (`rounded-full`), accompanied by rotating vector chevrons:
- **Primary Lime Action Dropdown**: `bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs h-10 px-4 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] flex items-center justify-between gap-2 border-0`
- **Soft Mint Filter Dropdown**: `bg-[#F4F7F4] hover:bg-[#E8ECE8] active:scale-[0.98] text-[#16281D] font-bold text-xs h-10 px-4 rounded-full border border-black/5 hover:border-black/10 flex items-center justify-between gap-2 shadow-xs` (open: `border-2 border-[#9FE870] ring-3 ring-[#9FE870]/25 bg-white`)
- **Secondary Forest Dark Dropdown**: `bg-[#16281D] hover:bg-[#203628] active:scale-[0.98] text-white font-bold text-xs h-10 px-4 rounded-full shadow-xs flex items-center justify-between gap-2 border-0` (open: `ring-3 ring-[#9FE870]/30`)
- **Ghost / Outline Dropdown**: `bg-white hover:bg-[#F4F7F4] active:scale-[0.98] text-[#52525B] font-bold text-xs h-10 px-4 rounded-full border border-[#E4E4E7] hover:border-[#16281D]/30 flex items-center justify-between gap-2 shadow-xs`

---

## 7. Status Badges, System Indicators & Pill Tags

### Operational Status Badges (with 8px Colored Dot)

| Status | Dot Token | Badge Classes | Usage |
|---|---|---|---|
| **Active / Online** | `w-2 h-2 rounded-full bg-[#22C55E]` | `bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]` | Active agent, healthy webhook, connected tenant |
| **Low Balance Warning** | `w-2 h-2 rounded-full bg-[#F59E0B]` | `bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]` | Low credit balance, queue backlog |
| **Critical / Failed** | `w-2 h-2 rounded-full bg-[#EF4444]` | `bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]` | Meta API error, 401 unauthorized, disconnected agent |
| **Offline / Draft** | `w-2 h-2 rounded-full bg-[#71717A]` | `bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]` | Unsaved draft, offline agent, archived record |

*Base badge geometry*: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold`.

### Telemetry Tags & Dark Inspector Badges

- **High-Contrast Telemetry Tags**: `bg-[#9FE870] text-[#16281D] font-bold text-xs px-3 py-1 rounded-full shadow-xs` (e.g. `90 msg/s`, `6M tokens`, `65% quota`) and `bg-[#F87171] text-white` (`4000 sessions`).
- **Dark Inspector Badges**:
  - Message Volume: `inline-flex items-center gap-1.5 bg-[#203628] text-[#9FE870] px-3.5 py-1.5 rounded-full text-xs font-bold` (`MessageSquare size={13}`).
  - System Uptime: `inline-flex items-center gap-1.5 bg-[#2E3C2B] text-[#D9F99D] px-3.5 py-1.5 rounded-full text-xs font-bold` (`ShieldCheck size={13}`).
  - Rating: `inline-flex items-center gap-1.5 bg-[#3A4E31] text-[#A3E635] px-3.5 py-1.5 rounded-full text-xs font-bold` (`Star size={13} fill="#A3E635"`).

---

## 8. Card Anatomy & Structural Containers

- **Light Workspace Card**: `bg-white rounded-2xl p-5 md:p-6 border border-[#EAEAEA] shadow-sm` (hover lift: `hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(20,40,24,0.1)] transition-all duration-200`).
- **Dark Inspector Card / Tile**: `bg-[#203628] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between text-white`.
- **Soft Mint Card**: `bg-[#F4F7F4] p-3.5 rounded-xl border border-black/5`.

---

## 9. Navigation Systems, Segmented Controls & Breadcrumbs

### Segmented Capsule Switch
- **Track**: `bg-[#E8ECE8] p-1 rounded-full border border-black/5 flex items-center gap-1`.
- **Active Segment**: `px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#16281D] text-white shadow-xs cursor-pointer border-0 transition-all`.
- **Inactive Segment**: `px-3.5 py-1.5 rounded-full text-xs font-bold text-[#52525B] hover:text-[#16281D] bg-transparent cursor-pointer border-0 transition-all`.

### Hierarchical Breadcrumbs
- `flex items-center gap-1.5 text-xs text-[#71717A]` with `ChevronRight size={13} text-[#A1A1AA]` and active crumb `font-bold text-[#16281D]`.

---

## 10. Form Controls, Custom Select Menus & Toggles

### Text Inputs
- **Standard Input**: `w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-sans`.
- **Focus State (Lime Glow)**: `bg-white border border-[#9FE870] ring-3 ring-[#9FE870]/25 text-xs text-[#16281D] font-medium outline-none`.
- **Error State**: `bg-[#FFF1F2] border border-[#F43F5E] ring-3 ring-[#F43F5E]/15 text-xs text-[#E11D48] outline-none`.
- **Dark Surface Input**: `bg-[#203628] border border-white/10 text-xs text-white placeholder-[#8FA89B] outline-none`.

### Custom Select Menus & Button Dropdowns
Dropdown triggers in Biz Agentz are first-class interactive button triggers and strictly adopt capsule button ergonomics (`rounded-full` / `border-radius: 9999px`) with 180° rotating chevrons, never boxy rectangular input fields (`rounded-xl`).

- **Light Select / Filter Trigger (Soft Mint Button Style)**: `w-full h-10 px-4 rounded-full text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]` (open: `border-2 border-[#9FE870] ring-3 ring-[#9FE870]/25 bg-white text-[#16281D]`, closed: `border border-black/5 bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D]`). Chevron: `ChevronDown size={14} transition-transform duration-200` (`rotate-180 text-[#16281D]`).
- **Primary Lime Action Dropdown Trigger**: `w-full h-10 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-bold text-xs shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all flex items-center justify-between gap-2` (open: `ring-3 ring-[#16281D]/20`).
- **Dark Surface Dropdown Trigger (Inspector & Dock)**: `w-full h-10 px-4 rounded-full text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]` (open: `border-2 border-[#9FE870] ring-3 ring-[#9FE870]/25 bg-[#203628] text-white`, closed: `border border-white/10 hover:border-white/25 bg-[#203628] hover:bg-[#274232] text-white`). Chevron: `rotate-180 text-[#9FE870]`.
- **Floating Popover Menu**: `absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#EAEAEA] p-1.5 shadow-[0_12px_36px_rgba(20,40,24,0.14)] z-30 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150` (dark surfaces: `bg-[#16281D] border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.35)]`).
- **Pill Menu Selection Items**: Option buttons are capsule pill items: `px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center justify-between border-0` (active: `bg-[#9FE870] text-[#16281D] shadow-xs`, inactive: `text-[#16281D] hover:bg-[#F4F7F4] bg-transparent`, with `Check size={13} strokeWidth={2.8}`). Dark options: active `bg-[#9FE870] text-[#16281D]`, inactive `text-[#E4E4E7] hover:bg-[#203628] hover:text-white`.

### Toggle Switches & Circular Checkboxes (`RoundCheckbox`)
- **Toggle Switch**: Track `w-11 h-6 rounded-full transition-colors cursor-pointer p-0.5 border-0 flex items-center` (`bg-[#9FE870]` active, `bg-[#E4E4E7]` inactive) with thumb `w-5 h-5 rounded-full bg-white shadow-sm transition-transform` (`translate-x-5` active, `translate-x-0` inactive).
- **Circular Checkbox (`RoundCheckbox`)**: Strictly circular (`rounded-full` / `border-radius: 9999px`), completely eliminating boxy, square, or semi-rounded checkboxes from table headers and rows:
  - **Unchecked**: `w-[18px] h-[18px] rounded-full border border-[#D4D4D8] bg-white hover:border-[#16281D] hover:bg-[#F4F7F4] transition-all cursor-pointer`
  - **Checked (Full Selection)**: `w-[18px] h-[18px] rounded-full bg-[#16281D] border border-[#16281D] text-[#9FE870] shadow-2xs flex items-center justify-center` with `<Check size={11} strokeWidth={3} />`
  - **Indeterminate (Partial Bulk Selection)**: `w-[18px] h-[18px] rounded-full bg-[#16281D] border border-[#16281D] text-[#9FE870] shadow-2xs flex items-center justify-center` with `<Minus size={11} strokeWidth={3.5} />`
  - **Accessibility**: Built with an underlying semantic `<input type="checkbox" className="sr-only" />` to preserve keyboard focus (`peer-focus-visible:ring-2 peer-focus-visible:ring-[#9FE870]`) and screen-reader accessibility.

---

## 11. Data Tables & Record Management

- **Table Header**: `bg-[#F8FAF8] border-b border-[#EAEAEA]`, cells `px-4 py-3 text-[11px] font-bold text-[#52525B] uppercase tracking-wider text-left`.
- **Bulk Selection Header Cell**: `w-[38px] text-center p-2.5` housing `<RoundCheckbox ref={selectAllCheckboxRef} checked={isAllSelected} indeterminate={isIndeterminate} onChange={...} />`.
- **Table Rows**: Row padding `px-4 py-3 text-xs`, hover highlight `hover:bg-[#FAFFFE]`, selected highlight `bg-[#F0FDF4] transition-colors cursor-pointer`.
- **Row Selection Cell**: `w-[38px] text-center p-2.5` housing `<RoundCheckbox checked={isSelected} onChange={...} />`.
- **Tenant Cell**: Avatar `w-7 h-7 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-bold text-[11px]`.
- **Action Link**: `inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:text-[#047857] transition-colors cursor-pointer bg-transparent border-0`.

---

## 12. Modal Dialogs & Contextual Drawers

### Centered Modal Dialogs
- **Backdrop Scrim**: `fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity z-50 flex items-center justify-center p-4`.
- **Modal Container**: `relative bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#EAEAEA] shadow-[0_24px_72px_rgba(20,40,24,0.22)] z-10 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200`.
- **Header**: Icon badge `w-10 h-10 rounded-2xl bg-[#16281D] text-[#9FE870] flex items-center justify-center shrink-0`, title `font-bold text-base text-[#16281D]`, close button `w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#71717A] hover:text-[#16281D] flex items-center justify-center border-0 cursor-pointer transition-colors`.
- **Footer Actions**: Cancel `px-4 py-2.5 rounded-full text-xs font-bold text-[#52525B] hover:text-[#16281D] hover:bg-[#F4F7F4] border border-[#E4E4E7] cursor-pointer transition-all`, Primary CTA `px-5 py-2.5 rounded-full text-xs font-bold bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.3)] cursor-pointer border-0 transition-all flex items-center gap-1.5`.

### Slide-Over Contextual Drawers
- **Backdrop Scrim**: `fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity z-50`.
- **Slide-Over Panel**: `fixed inset-y-0 right-0 max-w-full flex pl-10` → `w-screen max-w-md bg-[#16281D] text-white p-7 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300`.
- **Header**: Live beacon `w-2.5 h-2.5 rounded-full bg-[#9FE870] animate-pulse`, title `text-xl font-bold text-white`, close `w-8 h-8 rounded-full bg-[#203628] hover:bg-[#264432] text-[#8FA89B] hover:text-white`.
- **Attributes**: `bg-[#203628] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between`.
- **Pinned Footer**: Primary CTA `w-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-bold text-sm py-3.5 rounded-full shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all flex items-center justify-center gap-2`, Dismiss `w-full bg-transparent text-[#8FA89B] hover:text-white font-semibold text-xs py-2 border-0 cursor-pointer`.

---

## 13. Alerts, Banners & Toast Notifications

| Variant | Background | Border | Title Text | Body Text | Icon Token |
|---|---|---|---|---|---|
| **Success** | `#F0FDF4` | `#BBF7D0` | `#15803D` (Bold `text-xs`) | `#166534` (`text-[11px]`) | `CheckCircle2 size={18} text-[#15803D]` |
| **Warning** | `#FFFBEB` | `#FDE68A` | `#92400E` (Bold `text-xs`) | `#B45309` (`text-[11px]`) | `AlertTriangle size={18} text-[#D97706]` |
| **Danger** | `#FFF1F2` | `#FECDD3` | `#E11D48` (Bold `text-xs`) | `#BE123C` (`text-[11px]`) | `AlertCircle size={18} text-[#E11D48]` |
| **Info** | `#F0F9FF` | `#BAE6FD` | `#0369A1` (Bold `text-xs`) | `#075985` (`text-[11px]`) | `Info size={18} text-[#0284C7]` |

*Container Class*: `border p-3.5 rounded-xl flex items-center gap-3`.

---

## 14. Loading, Feedback & Empty States

- **Skeleton Shimmers**: Circular avatar `w-10 h-10 rounded-full bg-zinc-200 animate-pulse`, title bar `h-3.5 bg-zinc-200 rounded-md w-3/4 animate-pulse`, card block `h-14 bg-zinc-100 rounded-xl w-full animate-pulse`.
- **Vector Spinners**: `Loader2 size={20} className="animate-spin text-[#059669]"` accompanied by `text-xs font-medium text-[#16281D]` label.
- **Typing Pulse Indicator**: 3-dot staggered bounce (`w-1.5 h-1.5 rounded-full bg-[#059669] animate-bounce` with `[animation-delay:0.2s]` and `[animation-delay:0.4s]`) inside `bg-[#F4F7F4] px-3 py-1.5 rounded-full border border-black/5`.
- **Empty States**: Centered illustration inside soft green circle (`w-10 h-10 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center`), title `text-xs font-bold text-[#16281D]`, helper subtitle `text-[11px] text-[#71717A]`, and primary CTA pill `bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-bold text-[11px] px-3 py-1.5 rounded-full shadow-xs cursor-pointer border-0`.

---

## 15. Iconography Guidelines & Anti-Trope Directives

- **Primary Vector Library**: `lucide-react`.
- **Strict Emoji Ban**: Functional navigation symbols, status indicators, and buttons MUST NEVER use raw emoji characters (`🔥`, `🚀`, `💡`, `🏥`, `💉`).
- **Stroke Width**: Standard `2px` (or `2.4px` - `2.6px` for micro icons ≤ 14px).
- **Icon Sizing Grid**:
  - Micro (`11px` - `13px`): Badges, tooltips, inline stats (`Star`, `MessageSquare`, `Clock`).
  - Action / Field (`14px` - `16px`): Buttons, search inputs, dropdown chevrons.
  - Card & Section (`18px` - `22px`): Alerts, modal headers, empty state icons.
  - Rail & Navigation (`20px`): Left dock icon shortcuts (`LayoutGrid`, `FileText`, `MessageSquare`).

---

## 16. Accessibility (WCAG AAA), Focus Rings & Usability

- **High-Contrast Validation**: The signature pairing of Deep Forest `#16281D` text on Vibrant Lime `#9FE870` yields an **11.5:1** contrast ratio, surpassing the WCAG AAA requirement of 7:1.
- **Keyboard Navigation**: All interactive controls provide visible focus indicators: `focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/25 outline-none`.
- **Minimum Touch Targets**: All mobile touch targets must be at least `44×44px`.

---

## 17. Motion System, Timing Tokens & Micro-Interactions

### 1. Duration Tokens & Easing Curves

| Easing Token | Bezier Definition | Duration | Usage |
|---|---|---|---|
| **Snappy Ease-Out** | `cubic-bezier(0.16, 1, 0.3, 1)` | `350ms` | **UI Default**: Dropdowns, drawers, modal reveals, cards |
| **Tactile Spring** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `400ms` | Micro-interactions: Toggle switches, active tags, star ratings |
| **Standard Smooth** | `cubic-bezier(0.4, 0, 0.2, 1)` | `250ms` | Transitions: Color shifts, border glows, opacity |
| **Linear** | `linear` | `900ms` | Continuous loops: Vector spinners, telemetry beacons |

### 2. Tactile Micro-Interactions
- **Card Hover Lift**: `hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(20,40,24,0.1)] transition-all duration-200 cursor-pointer`.
- **Button Compression**: `active:scale-[0.98]` or `active:scale-95 transition-transform duration-100`.
- **Lime Glow Pulse**: Saved state confirmation via `ring-4 ring-[#9FE870] shadow-[0_0_24px_rgba(159,232,112,0.6)] duration-300`.
- **Chevron Rotation**: 180° flip on expansion (`transition-transform duration-200 transform rotate-180`).

### 3. Continuous Operational Telemetry Loops
- **Radar Beacon Ping**: Expanding concentric ring (`animate-ping absolute inline-flex h-10 w-10 rounded-full bg-[#9FE870] opacity-60` with inner `h-4 w-4 rounded-full bg-[#16281D] border-2 border-[#9FE870]`).
- **Throughput Traffic Pulse**: `w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center animate-pulse` with `Activity size={22}`.
- **AI Drafting 3-Dot Stagger**: 3 circular dots bouncing vertically with staggered delays (`0s`, `0.18s`, `0.36s`): `w-2 h-2 rounded-full bg-[#059669] animate-bounce` inside `bg-[#F4F7F4] px-4 py-3 rounded-full border border-black/5`.

### 4. Choreographed Entrance Transitions
- **Agent Page Entrances**: Uniformly governed by `animate-fade-in` (`fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)`) on `<main key={location.pathname}>`. Subcomponents (metric cards, toolbars, tables, and widgets) must NEVER introduce artificial delayed waterfalls (`delay: ...`), ensuring every agent page transitions instantaneously and identically at 60–120 FPS.
- **Modal Dialogs**: `animate-modal-backdrop` (`fadeIn 0.15s`) and `animate-modal-card` (`modalContentIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)`).
- **Slide-Over Contextual Drawers**: `animate-in slide-in-from-right duration-200`.
- **Toast Notifications**: `animate-in fade-in slide-in-from-bottom-3 duration-200`.

### 5. Accessibility & Reduced Motion (`prefers-reduced-motion`)

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

---

## 21. Conversation Workspace & Messaging Ergonomics

- **Split Workspace Architecture**:
  - **Left Stream Dock (`w-full md:w-80 lg:w-96`)**: Surface `#FFFFFF` on `#F4F7F4` floor, segmented capsule filter tabs (`All`, `Unread`, `AI`, `Orders`) with live unread counter badges. Capsule search input with `Plus` shortcut button in `#16281D` with `#9FE870` accent. Active conversation rendered with full containment rounded pill container (`bg-[#F0FDF4] border border-[#BBF7D0]`), strictly avoiding legacy 3px side-stripe borders.
  - **Center Messaging Canvas**: Floor `#F4F7F4`, glassmorphic top header (`bg-white/95 backdrop-blur-md border-b border-[#EAEAEA]`), WhatsApp 24-hour window status badge (`Free Messaging` in `#F0FDF4` / `#15803D` vs `Template Required` in `#FFFBEB` / `#D97706`), quick utility icon actions (`Layers`, `ShoppingBag`, `Info`) in circular `#F4F7F4` hover-elevated buttons.
- **Message Bubble Hierarchy**:
  - **Customer Messages**: Pure `#FFFFFF` rounded-2xl speech bubble, border `1px solid #EAEAEA`, primary typography `#16281D`, soft drop shadow `shadow-xs`.
  - **Agent Outgoing Messages**: Deep Forest `#16281D` rounded-2xl speech bubble, subtle border `1px solid rgba(255,255,255,0.08)`, typography `#FFFFFF`.
  - **Message Timestamps**: JetBrains Mono (`font-mono`) uppercase, high-contrast readable timestamps.
- **Chat Input Ergonomics**:
  - Auto-resizing capsule textarea with `#F4F7F4` floor transitioning to pure white on focus, enclosed with `#9FE870` ring.
  - Circular vector actions for product (`Package`), service (`Layers`), attachment (`Paperclip`), and voice note recording (`Mic`).
  - Signature Vibrant Lime capsule Send button (`bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D]`) with vector `Send` icon.
- **Contextual Modals & Slide-over Drawer**:
  - **Contact Details Drawer**: 380px slide-over sheet with Deep Forest `#16281D` avatar, `#9FE870` typography initial, live toggle for AI Agent co-pilot, and dual metric tiles for total messages and last seen timestamp.
  - **Product & Service Pickers**: Modal rounded-3xl with quick search filters and card select states in `#F0FDF4`.
  - **Lead Stage Modal**: Stepped progression selectors with color-coded stage pills (`Initial`, `Optional`) and high-contrast update actions.

---

## 22. Date & Time Picker Ergonomics & Specification

> **Live Interactive Component Reference**: [`/style-guide`](http://localhost:5173/style-guide) → *Date & Time Pickers* tab  
> **Component Primitives**: [`DatePicker.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/shared/DatePicker.tsx), [`TimePicker.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/shared/TimePicker.tsx), [`DateTimePicker.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/shared/DateTimePicker.tsx)

### 1. Architectural Philosophy & Geometry Scale
The Biz Agentz Date and Time Pickers replace raw browser inputs (`<input type="date">` / `<input type="time">`) with human-crafted, tactile components that adhere strictly to the Biz Agentz Design System:

| Component Level | Geometry Token | Dimension Scale | Visual Styling |
|---|---|---|---|
| **Trigger Button** | `rounded-full` | `h-10 px-4` (`md`) / `h-8 px-3` (`sm`) | Capsule button with vector icon, display value & quick `X` clear action. |
| **Floating Popover Card** | `rounded-3xl` | `w-[280px]` - `w-[340px]` | Floating popover with `shadow-[0_16px_48px_rgba(20,40,24,0.16)]` and `z-50`. |
| **Calendar Day Cells** | `rounded-full` | `32×32px` (`w-8 h-8`) | High-contrast circular targets, `JetBrains Mono` bold numerics. |
| **Quick Preset Chips** | `rounded-full` | `px-2.5 py-1 text-[11px]` | Instant single-tap accelerators for standard scheduling offsets. |
| **Time Selector Wells** | `rounded-xl` | `w-12 h-36` | Vertical scrollable column containers for hours and minutes. |
| **AM/PM Switcher** | `rounded-full` | `w-10 py-1.5` | Segmented vertical capsule pills. |

### 2. Color Tokens & Surface Variants

#### Light Canvas Surfaces (`variant="mint"`, `variant="white"`)
- **Trigger**: Soft mint `bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D] border border-black/5` (or pure white `bg-white border-[#EAEAEA]`).
- **Popover**: Pure white `bg-white border border-[#EAEAEA] text-[#16281D]` with `shadow-[0_16px_48px_rgba(20,40,24,0.16)]`.
- **Today Ring**: `border border-[#9FE870] text-[#16281D] font-bold`.
- **Selected Day**: `bg-[#9FE870] text-[#16281D] font-bold shadow-xs scale-105`.
- **Day Hover**: `hover:bg-[#F4F7F4] text-[#16281D]`.

#### Dark Inspector Surfaces (`variant="forest"`)
- **Trigger**: Deep forest dark `bg-[#203628] hover:bg-[#274232] text-white border border-white/10`.
- **Popover**: Deep forest dark `bg-[#16281D] border border-white/10 text-white shadow-2xl`.
- **Today Ring**: `border border-[#9FE870] text-white font-bold`.
- **Selected Day**: `bg-[#9FE870] text-[#16281D] font-bold shadow-xs`.
- **Day Hover**: `hover:bg-[#203628] text-white`.

### 3. Presets & Scheduling Accelerators
1. **Date Pickers**:
   - `Today` (0-day offset)
   - `Tomorrow` (+1 day offset)
   - `+3 Days` (expedited delivery offset)
   - `+1 Week` (standard appointment buffer)
2. **Time Pickers**:
   - `09:00 AM` (morning opening)
   - `10:30 AM` (mid-morning slot)
   - `11:00 AM` (late morning slot)
   - `02:00 PM` (afternoon operational window)
   - `03:30 PM` (afternoon consultation)
   - `05:00 PM` (evening review)

### 4. Accessibility & Contrast Verification (WCAG AAA)
- **Contrast Ratio**: The signature pairing of active `#9FE870` and `#16281D` yields an **11.5:1** contrast ratio, surpassing the WCAG AAA threshold of 7:1.
- **ARIA Semantics**: Triggers include `aria-haspopup="dialog"`, `aria-expanded`, and `aria-label`. The popover carries `role="dialog"`.
- **Keyboard Dismissal**: Pressing `Escape` or clicking outside immediately closes the popover without discarding valid selections.

### 5. System-Wide Deployment Reference
All legacy `<input type="date">` and `<input type="datetime-local">` controls have been replaced across the platform:
- **Order Delivery Estimates**: `CreateOrderModal.tsx`, `EditOrderModal.tsx`, `MarkPaidModal.tsx`, `InvoicePaymentModal.tsx` (`<DatePicker variant="white" />`).
- **Order Filters**: `OrdersPage.tsx` (`<DatePicker size="sm" variant="mint" />`).
- **Appointment Scheduling**: `CreateAppointmentModal.tsx`, `EditAppointmentModal.tsx` (`<DateTimePicker variant="mint" outputFormat="datetime-local" />`).
- **Analytics & Time Range Filters**: `TimeRangeFilter.tsx`, `AnalyticsHeader.tsx` (`<DatePicker size="sm" />`).

---

## 23. Search Bar Architecture, Ergonomics & Specification

> **Live Interactive Component Reference**: [`/style-guide`](http://localhost:5173/style-guide) → *Search Bars* tab  
> **Component Catalog**: [`SearchBarPanel.tsx`](file:///c:/Github/whatsbi/frontend/src/components/styleguide/tokens/SearchBarPanel.tsx)

### 1. Architectural Philosophy & Capsule Geometry
Search bars across Biz Agentz serve as the high-velocity operational entry point for filtering entity records, initiating actions, and querying customer datasets. They strictly adhere to the following principles:

1. **Capsule Pill Geometry (`rounded-full`)**:
   - All search bars employ a full `border-radius: 9999px` (`rounded-full`), completely rejecting rigid boxy corners or semi-rounded rectangles.
   - Consistent `h-10` (40px) height providing an ergonomic touch target while conserving vertical density.
2. **Rule 7 Two-Row Toolbar Architecture (Row 1 Primary Anchor)**:
   - In all list views (Orders, Customers, Appointments, Invoices, Services, Broadcasts, Inventory), the search bar sits on **Row 1** alongside pagination and primary creation CTAs (`+ New Order`, `+ Add Customer`).
   - Desktop (`sm:` / `lg:`): The search capsule expands to consume **100% of remaining row width** via `flex-1 min-w-0`, preventing trailing empty space.
   - Mobile (`< sm`): Search spans `w-full` (100% width), with secondary action controls occupying their own 100% width row below it.
3. **Signature Lime Focus Energy**:
   - Focus state activates an instant border transition to `#9FE870` accompanied by a soft 20% alpha lime ring (`focus:ring-3 focus:ring-[#9FE870]/20` or `box-shadow: 0 0 0 3px rgba(159,232,112,0.2)`).
4. **Single-Tap Inline Clear Ergonomics**:
   - Whenever text is entered (`query.length > 0`), a right-aligned circular `[X]` clear button appears (`w-5 h-5 rounded-full bg-[#F4F7F4] text-[#71717A] hover:text-[#16281D]`).
   - Clicking clears the filter in a single tap without requiring manual backspacing or causing page layout jump.

---

### 2. Search Bar Design Variants & Token Specifications

| Variant | Surface Floor | Border & Focus Token | Metrics | Usage |
|---|---|---|---|---|
| **Primary Toolbar Search** | `#FFFFFF` (`bg-white`) | Border `#EAEAEA`, Focus `#9FE870` ring | `h-10 pl-9 pr-9 rounded-full text-xs` | Primary search on Orders, Customers, Invoices, Appointments |
| **Global Command Palette** | `#F4F7F4` (`hover:bg-[#EAEAEA]`) | Border `#EAEAEA`, Keybadge `⌘K` | `h-10 pl-9 pr-18 rounded-full text-xs` | Top navigation trigger launching system command palette |
| **Dark Inspector Search** | `#203628` (Forest Dark) | Border `white/10`, Focus `#9FE870` ring | `h-10 pl-9 pr-9 rounded-full text-xs text-white` | Campaign drawer, audience search, dark panel filters |
| **In-Menu Dropdown Search** | `#FFFFFF` on `#F4F7F4` | Border `#EAEAEA`, Focus `#9FE870` | `h-8 pl-8 pr-7 rounded-lg text-xs` | Sticky search header inside `CustomDropdown.tsx` popovers |
| **Modal / Entity Selector** | `#FAFAFA` (`hover:bg-white`) | Border `#EAEAEA`, Focus `#9FE870` | `h-10 pl-9 pr-9 rounded-full text-xs` | Selection modals (`CreateOrderModal`, `SelectCustomerModal`) |

---

### 3. Interactive States Matrix

1. **Idle State**:
   - Vector search icon (`Search size={14}`) left-aligned at `left-3.5` in muted `#A1A1AA`.
   - Placeholder text in `#A1A1AA` with descriptive contextual hint (e.g. `"Search orders by customer, phone, status..."`).
   - Background `#FFFFFF` with subtle border `1px solid #EAEAEA`.
2. **Hover State**:
   - Border transitions to `#D4D4D8` with subtle depth.
3. **Focused State**:
   - Border transitions to Brand Lime `#9FE870`.
   - Subtle outer glow: `ring-3 ring-[#9FE870]/20` or `box-shadow: 0 0 0 3px rgba(159,232,112,0.2)`.
   - Text color: Deep Forest `#16281D` (or `#FFFFFF` on dark surfaces).
4. **Filled State (With Query)**:
   - Trailing circular clear button `[X]` (`w-5 h-5 rounded-full`) renders dynamically on the right (`right-3`).
   - Clicking immediately clears input, resets filtering, and retains keyboard focus.
5. **Debounced / Loading State**:
   - Circular clear icon transitions to `<Loader2 size={16} className="animate-spin text-[#9FE870]" />` while backend search requests are in flight.
6. **Disabled State**:
   - Background `#F4F4F5`, text `#A1A1AA`, cursor `cursor-not-allowed`, opacity `0.6`.

---

### 4. Implementation Code Snippet

```tsx
<div className="relative flex items-center w-full">
  <Search
    size={14}
    className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
  />
  <input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Search by customer, phone, status..."
    className="w-full h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
  />
  {searchTerm && (
    <button
      type="button"
      onClick={() => setSearchTerm('')}
      className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
      title="Clear search"
    >
      <X size={12} />
    </button>
  )}
</div>
```

---

### 5. System-Wide Deployment Reference
- **Orders Page**: [`OrdersPage.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/orders/OrdersPage.tsx)
- **Customers Page**: [`CustomersPage.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/customers/CustomersPage.tsx)
- **Invoices Page**: [`InvoiceToolbar.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/invoices/InvoiceToolbar.tsx)
- **Appointments Page**: [`AppointmentsPage.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/appointments/AppointmentsPage.tsx)
- **Inventory Page**: [`InventoryPage.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/inventory/InventoryPage.tsx)
- **Services Page**: [`ServicesPage.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/services/ServicesPage.tsx)
- **Broadcasts Page**: [`BroadcastsPage.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/broadcasts/BroadcastsPage.tsx)
- **Top Navigation Command Palette**: [`HeaderCommandPalette.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/shared/HeaderCommandPalette.tsx)
- **In-Menu Dropdowns**: [`CustomDropdown.tsx`](file:///c:/Github/whatsbi/frontend/src/components/agent/shared/CustomDropdown.tsx)



