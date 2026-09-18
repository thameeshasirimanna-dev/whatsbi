# Biz Agentz Design Foundations

## 1. Visual Theme & Philosophy

Biz Agentz employs a dual-surface visual architecture designed for high-focus operational workflows:
- **Dark Forest Environment**: Used for the primary navigation shell, agent status header, and control sidebar to provide visual grounding and reduce eye fatigue.
- **Light Mint Workspace**: Used for high-density customer lists, message bubbles, order cards, and analytics panes to maximize text contrast and readability.

---

## 2. Color Palette & Design Tokens

### Forest Dark (Navigation Shell & Surface Elevation)
- `forest-950` (`#060e07`): Deepest background token
- `forest-900` (`#0c1a0e`): Sidebar background
- `forest-800` (`#142918`): Dark cards and raised surface components
- `forest-700` (`#1a3620`): Dark borders and structural dividers
- `forest-600` (`#234028`): Interactive hover states on dark surfaces

### Green Accent Scale (Light Workspaces & Indicators)
- `green-50` (`#f0fdf4`): Subtle light background tints and selected states
- `green-100` (`#dcfce7`): Skeleton shimmers and secondary hover states
- `green-200` (`#bbf7d0`): Surface borders on light backgrounds
- `green-300` (`#86efac`): Muted accent borders
- `green-400` (`#4ade80`): Bright status indicators and badges
- `green-500` (`#22c55e`): Primary interactive accent (toggles, active dots, tab indicators)

### Emerald Brand Scale (Calls to Action & Identity)
- `emerald-400` (`#34d399`): Gradient highlights
- `emerald-500` (`#10b981`): Secondary gradient stop
- `emerald-600` (`#059669`): Primary branding and main action buttons
- `emerald-700` (`#047857`): Active and hover state for primary action buttons
- `emerald-800` (`#065f46`): Deep brand contrast

### Semantic Tokens
- **Success**: `#22c55e` (`green-500`) — Message delivered, order completed, invoice paid
- **Warning**: `#f59e0b` (`amber-500`) — Payment pending, follow-up required
- **Danger**: `#f43f5e` (`rose-500`) — Message delivery failure, cancellation, errors
- **Info**: `#3b82f6` (`blue-500`) — Information banners, system notices

---

## 3. Typography Hierarchy

### Font Families
- **Display & Headings**: `Syne` (weights: 600, 700, 800)
- **Body & Interface**: `DM Sans` (weights: 300, 400, 500, 600)
- **Monospace (SKUs, IDs, Codes)**: `JetBrains Mono` or system `ui-monospace`

### Scale & Responsiveness
Fluid typography scales smoothly from ultra-compact mobile viewports up to large desktop screens using `clamp()` expressions:
- `text-xs`: `0.75rem` (12px)
- `text-sm`: `0.875rem` (14px)
- `text-base`: `1rem` (16px)
- `text-lg`: `clamp(1.125rem, 1rem + 0.5vw, 1.25rem)`
- `text-xl`: `clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)`
- `text-2xl`: `clamp(1.5rem, 1.25rem + 1vw, 2rem)`
- `text-3xl`: `clamp(1.875rem, 1.5rem + 1.5vw, 2.5rem)`

---

## 4. Spacing & Layout Bounds

### Global Layout Bounds
- **Desktop Screens**: Maximum layout width is strictly bounded to `90vw` to maintain balanced visual composition on widescreen displays.
- **Mobile and Tablet Screens**: Maximum layout width is bounded to `95vw` to ensure maximal content area while preserving edge gutters.
- **Content Centering**: Containers utilize balanced margin autos (`mx-auto`) to center content evenly.

### 4px Spacing Grid
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-6`: 24px
- `space-8`: 32px
- `space-12`: 48px

---

## 5. Elevation & Shadows

- `shadow-sm`: `0 1px 3px rgba(0, 0, 0, 0.06)` (inputs, small chips)
- `shadow-md`: `0 4px 16px rgba(0, 0, 0, 0.08)` (content cards, chat bubbles)
- `shadow-lg`: `0 8px 32px rgba(0, 0, 0, 0.12)` (dropdowns, popovers)
- `shadow-xl`: `0 16px 48px rgba(0, 0, 0, 0.16)` (modals, dialog overlays)

---

## 6. Motion & Transitions

Standard cubic-bezier easing curves are configured in `:root`:
```css
:root {
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

- **Micro-Interactions (100–150ms)**: Button hover, checkbox toggles, active border shifts.
- **Surface Transitions (200–300ms)**: Dropdown menus, modal entrance, tab switches.
- **Structural Expansions (300–450ms)**: Accordion toggles, conversation drawer reveal.

---

## 7. Iconography & Styling Rules

- **Iconography**: Scalable vector icons only (`@heroicons/react`, `lucide-react`).
- **No Emoji Icons**: Emoji characters must never be used as UI icons, list bullets, or status markers.
- **Title Presentation**: Never use pill tags or badge wrappers for headings or titles.
- **Media Optimization**: All graphical illustrations, avatars, and static promotional images must be stored and served in `.webp` format.
