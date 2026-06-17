# Design

## Visual Theme
The interface operates in a dual mode: a dark forest green environment for the core agent/admin shell navigation and control sidebar, and a clean, light mint/green environment for active workspaces and chat panels.

## Color Palette
### Forest Dark (Sidebar & Surfaces)
- `forest-950` (`#060e07`): Deepest dark background
- `forest-900` (`#0c1a0e`): Sidebar background
- `forest-800` (`#142918`): Dark card/surface background
- `forest-700` (`#1a3620`): Dark borders & dividers
- `forest-600` (`#234028`): Hover state on dark elements

### Green Accent Scale (Light Context)
- `green-50` (`#f0fdf4`): Light success background/tint
- `green-100` (`#dcfce7`): Hover state background & skeletons
- `green-200` (`#bbf7d0`): Borders on light backgrounds
- `green-500` (`#22c55e`): Primary interactive accent (toggles, active indicators)

### Emerald Brand Scale
- `emerald-500` (`#10b981`): Interactive accent highlights
- `emerald-600` (`#059669`): Primary branding & CTA buttons
- `emerald-700` (`#047857`): Primary CTA hover state

## Timing & Easing Curves
We define standardized transition classes and variables for premium, organic movement:
- **Fast Feedback** (100-150ms): Hover, click, toggles, badge transitions.
- **Normal Transitions** (200-300ms): Dropdowns, modals, page content fades, tab switching.
- **Stagger & Reveals** (300-500ms): Expandable accordions, lists stagger reveals.

### CSS Custom Variables
```css
:root {
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

## Typography
- **Headings & Display**: `Syne` (font-weight: 600, 700, 800)
- **Body & Interface**: `DM Sans` (font-weight: 300, 400, 500, 600)

## Spacing & Elevation
- Spacing uses a 4px base scale (4px, 8px, 12px, 16px, 24px, 32px).
- Shadows:
  - `shadow-sm`: `0 1px 3px rgba(0,0,0,0.06)` (inputs)
  - `shadow-md`: `0 4px 16px rgba(0,0,0,0.08)` (cards, panels)
  - `shadow-lg`: `0 8px 32px rgba(0,0,0,0.12)` (dropdowns, popovers)
  - `shadow-xl`: `0 16px 48px rgba(0,0,0,0.16)` (modals)
