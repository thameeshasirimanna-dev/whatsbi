# WhatsBi Design System — Style Guide

> Live component reference: [`/style-guide`](http://localhost:5173/style-guide)  
> Stack: React 18 · TypeScript · Tailwind CSS · Syne + DM Sans

---

## Table of Contents

1. [Colors](#1-colors)
2. [Typography](#2-typography)
3. [Buttons](#3-buttons)
4. [Badges & Pills](#4-badges--pills)
5. [Cards](#5-cards)
6. [Form Elements](#6-form-elements)
7. [Navigation](#7-navigation)
8. [Data Display](#8-data-display)
9. [Shadows & Elevation](#9-shadows--elevation)
10. [Spacing](#10-spacing)
11. [Border Radius](#11-border-radius)
12. [Icons](#12-icons)
13. [Avatars & Indicators](#13-avatars--indicators)
14. [Alerts & Notifications](#14-alerts--notifications)
15. [Progress & Stats](#15-progress--stats)
16. [Loading States](#16-loading-states)
17. [Tables](#17-tables)

---

## 1. Colors

### Forest Dark — Sidebar & Surfaces

| Token | Hex | Usage |
|---|---|---|
| `forest-950` | `#060e07` | Deepest dark |
| `forest-900` | `#0c1a0e` | **Sidebar background** |
| `forest-800` | `#142918` | Dark card / surface |
| `forest-700` | `#1a3620` | Dark borders / dividers |
| `forest-600` | `#234028` | Hover state on dark |

### Green — Accent Scale

| Token | Hex | Usage |
|---|---|---|
| `green-50` | `#f0fdf4` | Light backgrounds, success tint |
| `green-100` | `#dcfce7` | Skeleton shimmer, hover bg |
| `green-200` | `#bbf7d0` | Borders on light |
| `green-300` | `#86efac` | Muted accent |
| `green-400` | `#4ade80` | **Bright accent** — sidebar active dot, dark badge text |
| `green-500` | `#22c55e` | **Interactive green** — toggles, active states, count badges |

### Emerald — Brand Palette

| Token | Hex | Usage |
|---|---|---|
| `emerald-400` | `#34d399` | Gradient text highlight |
| `emerald-500` | `#10b981` | Button gradient end |
| `emerald-600` | `#059669` | **Brand color** — primary CTA, logo |
| `emerald-700` | `#047857` | Hover on primary button |
| `emerald-800` | `#065f46` | Deep brand shade |

### Semantic

| Name | Hex | Token | Usage |
|---|---|---|---|
| Success | `#22c55e` | `green-500` | Resolved, connected, approved |
| Warning | `#f59e0b` | `amber-500` | Pending review, caution |
| Danger | `#f43f5e` | `rose-500` | Error, delete, failed |
| Info | `#3b82f6` | `blue-500` | Informational, version tags |

### Button Gradient (Primary)

```
linear-gradient(135deg, #22c55e 0%, #059669 100%)
box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35)
```

### Animated Gradient Text

```css
.text-gradient-animate {
  background: linear-gradient(90deg, #4ade80, #22c55e, #059669, #10b981, #4ade80);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 4s linear infinite;
}
```

---

## 2. Typography

### Font Families

| Role | Family | Weights | Import |
|---|---|---|---|
| Display / Headings | **Syne** | 600, 700, 800 | Google Fonts |
| Body / UI | **DM Sans** | 300, 400, 500, 600 | Google Fonts |

Inject via `<style>` tag (no index.html modification required):

```tsx
const FONTS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
`;
```

```tsx
const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties   = { fontFamily: "'DM Sans', sans-serif" };
```

### Heading Scale (Syne)

| Tag | Size | Weight | Line Height | Tailwind |
|---|---|---|---|---|
| H1 | `2.75rem` / 44px | 800 | 1.06 | `text-5xl font-black` |
| H2 | `1.875rem` / 30px | 700 | 1.10 | `text-3xl font-bold` |
| H3 | `1.3125rem` / 21px | 700 | 1.20 | `text-xl font-bold` |
| H4 | `1.0625rem` / 17px | 600 | 1.30 | `text-lg font-semibold` |

### Body Scale (DM Sans)

| Name | Size | Weight | Line Height | Use case |
|---|---|---|---|---|
| `body-lg` | `1.125rem` / 18px | 400 | 1.70 | Hero paragraph, feature desc |
| `body-md` | `1rem` / 16px | 400 | 1.60 | Default body, card text |
| `body-sm` | `0.875rem` / 14px | 400 | 1.55 | Secondary info, labels |
| `body-xs` | `0.75rem` / 12px | 400 | 1.40 | Meta text, hints, captions |

---

## 3. Buttons

### Variants

| Variant | Background | Text | Border | Box Shadow |
|---|---|---|---|---|
| **Primary** | `linear-gradient(135deg, #22c55e, #059669)` | `#fff` | none | `0 4px 14px rgba(34,197,94,0.35)` |
| **Secondary** | transparent | `#16a34a` | `1.5px solid #16a34a` | none |
| **Soft** | `#f0fdf4` | `#15803d` | `1px solid #bbf7d0` | none |
| **Ghost** | `rgba(0,0,0,0.04)` | `#27272a` | none | none |
| **Danger** | `#fff1f2` | `#f43f5e` | `1.5px solid #fecdd3` | none |
| **Disabled** | `#f4f4f5` | `#a1a1aa` | `1px solid #e4e4e7` | none, opacity 0.6 |

### Sizes

| Size | Font | Padding | Border Radius |
|---|---|---|---|
| XS | `0.6875rem` | `0.3125rem 0.75rem` | `9999px` |
| SM | `0.75rem` | `0.375rem 0.875rem` | `9999px` |
| MD | `0.875rem` | `0.5625rem 1.25rem` | `9999px` |
| LG | `1rem` | `0.8125rem 1.75rem` | `9999px` |

### On Dark Background

Primary and ghost variants adjusted for dark contexts:

```tsx
// Primary on dark
boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)'

// Ghost on dark
color: 'rgba(255, 255, 255, 0.7)'
border: '1px solid rgba(255, 255, 255, 0.15)'
```

---

## 4. Badges & Pills

### Status Chips

| Status | Background | Text | Border | Dot |
|---|---|---|---|---|
| Active | `#f0fdf4` | `#15803d` | `#bbf7d0` | `#22c55e` |
| Pending | `#fffbeb` | `#d97706` | `#fde68a` | `#f59e0b` |
| Closed | `#f4f4f5` | `#52525b` | `#e4e4e7` | `#a1a1aa` |
| Resolved | `#eff6ff` | `#2563eb` | `#bfdbfe` | `#3b82f6` |
| Error | `#fff1f2` | `#e11d48` | `#fecdd3` | `#f43f5e` |
| New | `#fdf4ff` | `#9333ea` | `#e9d5ff` | `#a855f7` |

Structure:

```tsx
<span style={{
  fontSize: '0.75rem', fontWeight: 600,
  padding: '0.3rem 0.75rem', borderRadius: '9999px',
  background: bg, color, border: `1px solid ${border}`,
  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
}}>
  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot }} />
  {label}
</span>
```

### On Dark Context

```tsx
// Emerald tag on dark
background: 'rgba(34, 197, 94, 0.12)'
border: '1px solid rgba(34, 197, 94, 0.22)'
color: '#4ade80'

// Blue version tag
background: 'rgba(59, 130, 246, 0.12)'
border: '1px solid rgba(59, 130, 246, 0.2)'
color: '#60a5fa'
```

---

## 5. Cards

### Dark Feature Card

Gradient border wrap → dark inner surface. Used in feature sections.

```tsx
// Outer gradient border
background: 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(5,150,105,0.04) 50%, rgba(34,197,94,0.1) 100%)'
padding: '1.5px'
borderRadius: '16px'

// Inner card
background: '#0f2012'
border: '1px solid rgba(255,255,255,0.07)'
borderRadius: '14.5px'
```

### Glass Card

Used on light backgrounds where content is behind it.

```tsx
background: 'rgba(255, 255, 255, 0.72)'
backdropFilter: 'blur(20px)'
WebkitBackdropFilter: 'blur(20px)'
border: '1px solid rgba(255, 255, 255, 0.55)'
boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
borderRadius: '16px'
```

### Stat Card (Dark)

```tsx
background: '#0f2012'
border: '1px solid rgba(255,255,255,0.07)'
borderRadius: '16px'
// Value: Syne 800, 2.125rem, color #fff
// Trend: TrendingUp icon + green-400 text
```

### Outline Card (Light)

```tsx
background: '#fff'
border: '1.5px solid #bbf7d0'
borderRadius: '16px'
// Icon box: background #f0fdf4, border 1.5px #bbf7d0
```

---

## 6. Form Elements

### Text Input

```tsx
// Default
background: '#fafafa'
border: '1.5px solid #e4e4e7'
borderRadius: '8px'
padding: '0.5625rem 0.875rem'
fontSize: '0.875rem'

// Focus
border: '1.5px solid #22c55e'
boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.1)'

// Error
background: '#fff1f2'
border: '1.5px solid #f43f5e'
boxShadow: '0 0 0 3px rgba(244, 63, 94, 0.1)'
```

### Toggle Switch

```tsx
// Track: 40×22px, borderRadius 11px
background: isOn ? '#22c55e' : '#e4e4e7'
transition: 'background 0.2s'

// Thumb: 16×16px, borderRadius 50%
background: '#ffffff'
left: isOn ? '21px' : '3px'
transition: 'left 0.2s'
boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
```

### Checkbox

```tsx
// Checked
background: '#22c55e'
border: '2px solid #22c55e'
// contains Check icon, width 11px, color #fff

// Unchecked
background: '#fff'
border: '2px solid #d4d4d8'
borderRadius: '4px'
```

---

## 7. Navigation

### Sidebar Item

```tsx
// Active
background: 'rgba(34, 197, 94, 0.12)'
icon color: '#4ade80'
text: { fontWeight: 600, color: '#fff' }
dot indicator: '#4ade80'

// Default
background: 'transparent'
icon color: 'rgba(255,255,255,0.25)'
text: { fontWeight: 400, color: 'rgba(255,255,255,0.42)' }

// Hover
background: 'rgba(255,255,255,0.05)'
```

### Tab Bar (Segmented Control)

```tsx
// Container
background: '#f0fdf4'
borderRadius: '8px'
padding: '3px'

// Active tab
background: '#fff'
borderRadius: '6px'
boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
fontWeight: 600
color: '#0c1a0e'

// Inactive tab
background: 'transparent'
color: '#71717a'
```

---

## 8. Data Display

### Conversation List Item

```
[Avatar 36px] [Name + Message preview]  [Time] [Unread badge] [Status chip]
```

- Unread row background: `#fafffe`
- Unread badge: `18×18px`, `bg #22c55e`, white bold text
- Status chip: `0.5rem` text, pill shape

### Agent Row

```
[Avatar 32px + status dot] [Name]  [Online/Away chip] [Active chats] [Resolved count] [⋯]
```

- Status dot: `8×8px`, online `#22c55e`, away `#a1a1aa`, border `2px solid #fff`
- Resolved count: Syne bold, `#22c55e`

---

## 9. Shadows & Elevation

| Token | Value | Use |
|---|---|---|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` | Subtle lift, input fields |
| `shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Cards, panels |
| `shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` | Dropdowns, popovers |
| `shadow-xl` | `0 16px 48px rgba(0,0,0,0.16)` | Modals, dialogs |
| `glow-sm` | `0 0 16px rgba(34,197,94,0.22)` | Accent elements, icon buttons |
| `glow-lg` | `0 0 40px rgba(34,197,94,0.38)` | Primary CTA buttons, logo mark |

---

## 10. Spacing

Based on Tailwind's default 4px base unit.

| Token | Size | Use |
|---|---|---|
| `1` | 4px | Icon gap, tight padding |
| `2` | 8px | Component internal spacing |
| `3` | 12px | Tag/badge padding |
| `4` | 16px | Card padding (small), list item padding |
| `6` | 24px | Section gap (small) |
| `8` | 32px | Card padding (standard) |
| `12` | 48px | Section gap (large) |
| `16` | 64px | Page section margin |

---

## 11. Border Radius

| Token | Value | Tailwind | Use |
|---|---|---|---|
| none | `0px` | `rounded-none` | Tables, flush images |
| sm | `4px` | `rounded` | Checkboxes, small tags |
| md | `8px` | `rounded-lg` | Inputs, dropdowns, menu items |
| lg | `12px` | `rounded-xl` | Panels, cards |
| xl | `16px` | `rounded-2xl` | Feature cards, modals |
| 2xl | `24px` | `rounded-3xl` | Dashboard mockup |
| full | `9999px` | `rounded-full` | Buttons (pill), avatars, badges |

---

## 12. Icons

Library: **lucide-react** `^0.544.0`

Standard icon sizes used:

| Context | Size |
|---|---|
| Inline body text | `14×14px` |
| Button icon | `13–14×13–14px` |
| Card / feature icon | `17–18×17–18px` |
| Sidebar nav icon | `14×14px` |
| Empty state / large | `32–40×32–40px` |

Core icons used in WhatsBi:

```
MessageSquare  Users         Bot           BarChart3     Zap
Shield         Search        Settings      Bell          Send
Phone          Download      Eye           Lock          Star
TrendingUp     TrendingDown  ArrowRight    ChevronRight  Check
X              Plus          Edit3         Trash2        AlertCircle
Info           CheckCircle   RefreshCw     Globe         Database
Activity       Inbox         Sparkles      MoreHorizontal Loader2
```

---

## 13. Avatars & Indicators

### Sizes

| Size | Diameter | Font | Status dot |
|---|---|---|---|
| XS | 24px | `0.5rem` | 6px |
| SM | 32px | `0.625rem` | 8px |
| MD | 40px | `0.75rem` | 9px |
| LG | 48px | `0.875rem` | 10px |
| XL | 56px | `1rem` | 12px |

### Status Dot

```tsx
position: 'absolute', bottom: 0, right: 0
width: dotSize, height: dotSize
borderRadius: '50%'
background: isOnline ? '#22c55e' : '#a1a1aa'
border: '2px solid #fff'  // or dark surface color
```

### Stacked Group

Overlap: `marginLeft: '-10px'` per avatar after the first. Overflow avatar shows `+N` count on `#f4f4f5` background.

---

## 14. Alerts & Notifications

### Semantic Banners

```
[Icon 17px]  [Title bold]          [✕ close]
             [Body text 0.8125rem]
```

| Type | Background | Border | Icon | Title |
|---|---|---|---|---|
| Success | `#f0fdf4` | `#bbf7d0` | CheckCircle `#22c55e` | `#15803d` |
| Warning | `#fffbeb` | `#fde68a` | AlertCircle `#f59e0b` | `#d97706` |
| Error | `#fff1f2` | `#fecdd3` | X `#f43f5e` | `#e11d48` |
| Info | `#eff6ff` | `#bfdbfe` | Info `#3b82f6` | `#2563eb` |

### Dark Toast

```tsx
background: '#0f2012'
border: '1px solid rgba(255,255,255,0.07)'
backdropFilter: 'blur(12px)'
// [Icon box 32px gradient] [Title white + subtitle muted] [Reply button green]
```

---

## 15. Progress & Stats

### Progress Bar

```tsx
// Track
height: '7px', borderRadius: '9999px'
background: semanticLightColor  // e.g. #f0fdf4

// Fill
background: semanticColor  // e.g. #22c55e
transition: 'width 0.6s ease'
```

### KPI Stat Block (Dark)

```
background: '#0f2012'
border: '1px solid rgba(255,255,255,0.07)'
borderRadius: '10px'

Label: DM Sans 0.5625rem, rgba(255,255,255,0.35)
Value: Syne 800, 1.375rem, #fff
Trend: TrendingUp/Down icon + green-400 or rose text
```

---

## 16. Loading States

### Skeleton Shimmer

```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.skeleton {
  background: linear-gradient(90deg, #e8f5e9 25%, #c8e6c9 50%, #e8f5e9 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 6px;
}
```

### Spinner

```css
@keyframes spin { to { transform: rotate(360deg); } }
```

```tsx
// Light context
border: '2px solid #dcfce7'
borderTopColor: '#22c55e'
borderRadius: '50%'
animation: spin 0.9s linear infinite

// Dark context
border: '2.5px solid rgba(255,255,255,0.1)'
borderTopColor: '#4ade80'
```

Sizes: `16px` / `24px` / `32px`

### Typing Pulse Dots

```css
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.85); }
}
/* Stagger: 0s, 0.2s, 0.4s delay per dot */
```

Dot: `7×7px`, `borderRadius: 50%`, `background: #22c55e`

---

## 17. Tables

### Structure

```
[Toolbar: Title + Search + Action button]
[Header row: bg #f8faf8, uppercase 0.625rem labels]
[Data rows: alternating hover, 0.875rem cells]
[Footer: result count + pagination]
```

### Header Cell

```tsx
fontSize: '0.625rem', fontWeight: 700
color: '#52525b', letterSpacing: '0.08em'
textTransform: 'uppercase'
padding: '0.75rem 1rem'
borderBottom: '1px solid #ebebeb'
background: '#f8faf8'
```

### Pagination Button

```tsx
// Active page
background: '#22c55e', color: '#fff'
fontWeight: 700

// Other pages
background: '#fff', color: '#52525b'
border: '1px solid #e4e4e7'
```

---

## CSS Variables (recommended setup)

```css
:root {
  /* Forest dark */
  --color-forest-950: #060e07;
  --color-forest-900: #0c1a0e;
  --color-forest-800: #142918;
  --color-forest-700: #1a3620;

  /* Green accent */
  --color-green-400: #4ade80;
  --color-green-500: #22c55e;

  /* Emerald brand */
  --color-brand:     #059669;
  --color-brand-lit: #10b981;

  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger:  #f43f5e;
  --color-info:    #3b82f6;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.16);
  --glow-sm:   0 0 16px rgba(34,197,94,0.22);
  --glow-lg:   0 0 40px rgba(34,197,94,0.38);
}
```

---

## Component File Reference

| Component | File |
|---|---|
| Landing Page | `frontend/src/components/LandingPage.tsx` |
| Login Page | `frontend/src/components/LoginPage.tsx` |
| Admin Dashboard | `frontend/src/components/AdminDashboard.tsx` |
| Agent Layout | `frontend/src/components/agent/shared/AgentLayout.tsx` |
| Sidebar | `frontend/src/components/agent/shared/Sidebar.tsx` |
| Conversations | `frontend/src/components/agent/conversations/ConversationsPage.tsx` |
| Analytics | `frontend/src/components/agent/analytics/AnalyticsPage.tsx` |
| **Style Guide** | `frontend/src/components/StyleGuidePage.tsx` |

Route: [`/style-guide`](http://localhost:5173/style-guide)
