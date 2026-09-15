# WhatsBi Design System & Component Style Guide

> Live component reference: [`/style-guide`](http://localhost:5173/style-guide)  
> Stack: React 18 · TypeScript · Tailwind CSS · Syne + DM Sans

---

## 1. Global Frontend Rules & Constraints

The following rules apply to all frontend components, views, modals, and landing pages:

1. **Global Style Storage**: All foundational styles, theme variables, animation keyframes, and color scales are defined globally in `index.css` or shared utility tokens. Avoid ad-hoc inline styles for reusable patterns.
2. **Iconography Standards**:
   - **No Emoji Icons Anywhere**: Never use native Unicode emoji characters as UI icons, list bullets, or state badges.
   - Use official vector SVGs from `lucide-react` or `@heroicons/react`.
3. **Layout & Viewport Bounds**:
   - **Desktop Devices**: Maximum layout container width is strictly `90vw` (`max-width: 90vw`). All main page content must reside comfortably within this boundary.
   - **Mobile and Tablet Devices**: Maximum layout container width is `95vw` (`max-width: 95vw`).
   - **Balanced Layouts**: Maintain symmetrical gutters, centered primary containers (`mx-auto`), and visual equilibrium across all screen sizes.
4. **Typography & Title Presentation**:
   - **No Pill Tags for Titles**: Never enclose section headings, modal titles, or page headers in rounded pill tags or chip wrappers.
   - **Fluid Typography**: Font sizes must be responsive across all displays, from small phones up to ultrawide monitors using fluid scaling.
5. **Asset Formats**:
   - **WebP Only**: All raster image assets, avatars, illustrations, and screenshots must be provided and served in `.webp` format.
6. **Authentic Craftsmanship**: Designs must avoid generic AI aesthetic tropes (e.g. over-blurred neon blobs, low-contrast ghost cards, ungrounded floating geometry).

---

## 2. Color Palette & Token System

### Forest Dark (Navigation Shell & Deep Surfaces)

| Token | Hex | Usage |
|---|---|---|
| `forest-950` | `#060e07` | Deepest background base |
| `forest-900` | `#0c1a0e` | **Sidebar background and shell header** |
| `forest-800` | `#142918` | Dark card, modal header, raised dark surfaces |
| `forest-700` | `#1a3620` | Dark borders, panel dividers |
| `forest-600` | `#234028` | Hover state on dark elements |

### Green Accent Scale (Light Workspaces)

| Token | Hex | Usage |
|---|---|---|
| `green-50` | `#f0fdf4` | Light success tints, selected row backgrounds |
| `green-100` | `#dcfce7` | Skeleton shimmers, hover background tints |
| `green-200` | `#bbf7d0` | Surface borders on light surfaces |
| `green-300` | `#86efac` | Muted decorative borders |
| `green-400` | `#4ade80` | **Bright accent**: sidebar active dot, dark badge text |
| `green-500` | `#22c55e` | **Interactive green**: toggles, active indicators, counter badges |

### Emerald Brand Palette

| Token | Hex | Usage |
|---|---|---|
| `emerald-400` | `#34d399` | Gradient text highlight |
| `emerald-500` | `#10b981` | Button gradient end stop |
| `emerald-600` | `#059669` | **Brand primary color**: primary CTA buttons, logo marks |
| `emerald-700` | `#047857` | Primary CTA hover state |
| `emerald-800` | `#065f46` | Deep brand contrast |

### Semantic System

| Name | Hex | Token | Usage |
|---|---|---|---|
| Success | `#22c55e` | `green-500` | Connected, order completed, invoice paid |
| Warning | `#f59e0b` | `amber-500` | Pending confirmation, follow-up required |
| Danger | `#f43f5e` | `rose-500` | Failed delivery, cancellation, error alerts |
| Info | `#3b82f6` | `blue-500` | System notices, guidance messages |

---

## 3. Typography Specification

### Font Families
- **Display & Titles**: `Syne` (weights: 600, 700, 800)
- **Body & Controls**: `DM Sans` (weights: 300, 400, 500, 600)

### Heading Scale (Syne)
| Level | Font Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| H1 | `clamp(2rem, 1.8rem + 1.2vw, 2.75rem)` | 800 | 1.06 | Main page titles (single per page) |
| H2 | `clamp(1.5rem, 1.35rem + 0.8vw, 1.875rem)` | 700 | 1.10 | Major section headers |
| H3 | `clamp(1.2rem, 1.1rem + 0.5vw, 1.3125rem)` | 700 | 1.20 | Card titles, modal headers |
| H4 | `1.0625rem` (17px) | 600 | 1.30 | Widget headers, drawer subtitles |

### Body Scale (DM Sans)
| Token | Font Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `body-lg` | `1.125rem` (18px) | 400 | 1.70 | Hero descriptions, intro blocks |
| `body-md` | `1rem` (16px) | 400 | 1.60 | Standard body text, card content |
| `body-sm` | `0.875rem` (14px) | 400 | 1.55 | Secondary data, field labels |
| `body-xs` | `0.75rem` (12px) | 400 | 1.40 | Meta details, timestamps, hints |

---

## 4. Button Components

### Variants
- **Primary**: Gradient `linear-gradient(135deg, #22c55e, #059669)`, white text, shadow `0 4px 14px rgba(34, 197, 94, 0.35)`.
- **Secondary**: Transparent background, `#16a34a` text, border `1.5px solid #16a34a`.
- **Soft**: `#f0fdf4` background, `#15803d` text, border `1px solid #bbf7d0`.
- **Ghost**: Transparent background, hover `rgba(0, 0, 0, 0.04)`, `#27272a` text.
- **Danger**: `#fff1f2` background, `#f43f5e` text, border `1.5px solid #fecdd3`.
- **Disabled**: `#f4f4f5` background, `#a1a1aa` text, opacity `0.6`, cursor `not-allowed`.

### Standard Sizes
- **XS**: `padding: 0.3125rem 0.75rem`, font `0.6875rem`
- **SM**: `padding: 0.375rem 0.875rem`, font `0.75rem`
- **MD**: `padding: 0.5625rem 1.25rem`, font `0.875rem`
- **LG**: `padding: 0.8125rem 1.75rem`, font `1rem`

---

## 5. Status Badges & Chips

### Status Chips (Data & Record States)
| State | Background | Text | Border | Indicator Dot |
|---|---|---|---|---|
| Active / Paid | `#f0fdf4` | `#15803d` | `#bbf7d0` | `#22c55e` |
| Pending | `#fffbeb` | `#d97706` | `#fde68a` | `#f59e0b` |
| Closed / Inactive | `#f4f4f5` | `#52525b` | `#e4e4e7` | `#a1a1aa` |
| Resolved | `#eff6ff` | `#2563eb` | `#bfdbfe` | `#3b82f6` |
| Error / Cancelled | `#fff1f2` | `#e11d48` | `#fecdd3` | `#f43f5e` |
| New Lead | `#fdf4ff` | `#9333ea` | `#e9d5ff` | `#a855f7` |

*Note: Badges and chips are strictly for data states and metadata tags. Do not use them as wrappers for headings or titles.*

---

## 6. Form Controls & Inputs

### Text Inputs
- **Base**: Background `#fafafa`, border `1.5px solid #e4e4e7`, border-radius `8px`, padding `0.5625rem 0.875rem`, font size `0.875rem`.
- **Focus**: Border `1.5px solid #22c55e`, box-shadow `0 0 0 3px rgba(34, 197, 94, 0.1)`.
- **Error**: Background `#fff1f2`, border `1.5px solid #f43f5e`, box-shadow `0 0 0 3px rgba(244, 63, 94, 0.1)`.

### Toggle Switches
- **Track**: `40×22px`, border-radius `11px`. Inactive: `#e4e4e7`, Active: `#22c55e`.
- **Thumb**: `16×16px`, border-radius `50%`, white, shadow `0 1px 3px rgba(0, 0, 0, 0.2)`.

### Checkboxes
- **Checked**: Background `#22c55e`, border `2px solid #22c55e`, white check SVG.
- **Unchecked**: Background `#fff`, border `2px solid #d4d4d8`, border-radius `4px`.

---

## 7. Cards & Containers

### Dark Feature Card
- Outer wrapper: Gradient border `linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(5, 150, 105, 0.04), rgba(34, 197, 94, 0.1))`.
- Inner container: Background `#0f2012`, border `1px solid rgba(255, 255, 255, 0.07)`, border-radius `16px`.

### Light Panel Card
- Background: `#ffffff`, border `1.5px solid #bbf7d0`, border-radius `16px`, shadow `0 4px 16px rgba(0, 0, 0, 0.04)`.

### Glass Panel
- Background: `rgba(255, 255, 255, 0.75)`, backdrop-filter `blur(20px)`, border `1px solid rgba(255, 255, 255, 0.55)`, border-radius `16px`.

---

## 8. Data Tables

- **Toolbar**: Header title, search filter input, and action triggers.
- **Table Header**: Background `#f8faf8`, border bottom `1px solid #ebebeb`, uppercase typography `0.625rem`, letter-spacing `0.08em`, font weight `700`, color `#52525b`.
- **Table Rows**: Height `48px`, font size `0.875rem`, hover highlight `background: #fafffe`.
- **Pagination Controls**: Active page `#22c55e` with white text; inactive pages `#ffffff` with border `1px solid #e4e4e7`.

---

## 9. Visual Feedback & Loading States

- **Skeleton Shimmers**: Linear gradient shimmer moving from `#e8f5e9` to `#c8e6c9` over `1.4s`.
- **Spinners**: Scalable 2px circular spinner rotating at `0.9s linear infinite`.
- **Pulse Indicators**: 3-dot staggered pulse for agent/chatbot typing states.
