# Responsive Toolbars, Filters & Metric Cards Standard

## 1. Universal Full-Width Row Rule for Toolbars & Filters
- **Zero Trailing Whitespace / Void Prohibition**: Filter controls, date pickers, dropdowns, and search toolbars must ALWAYS consume 100% of the row width (`w-full`) across ALL viewports (mobile, tablet, laptop, desktop, ultra-wide).
- **Prohibition of Fixed-Width Desktop Collapse**: Never apply `sm:flex-initial`, `sm:w-auto`, or rigid pixel max-widths to filter items that cause them to shrink and stop halfway across the row, leaving empty space on the right.
- **Two-Row Full-Width Architecture**:
  - **Row 1 (Search Bar & Primary Actions)**:
    - Search input expands across all available space (`flex-1 min-w-0`).
    - Rows per page selector and primary CTA button (`+ New Order`, `+ Create Invoice`, `+ Add Customer`) align to the right (`shrink-0 flex items-center gap-2 sm:gap-3 justify-between sm:justify-end`).
    - On mobile (`< sm`), Search spans 100% width, and action controls below it span 100% width with `justify-between`.
  - **Row 2 (Dedicated Filters Grid)**:
    - Must use semantic CSS Grid (`grid w-full items-center`).
    - Every filter button and dropdown occupies an equal column slot (`col-span-1 w-full min-w-0`).
    - Dropdown trigger buttons must use `w-full flex items-center justify-between` with label/icon on the left and chevron/clear action on the far right.

## 2. Responsive Grid Distribution Matrix
- **4-Filter Grids** (e.g., Orders, Customers with stage filter):
  - Mobile & Tablet: `grid-cols-2` (50% width each, 2 items per row).
  - Desktop (`lg:` / `xl:`): `lg:grid-cols-4` (25% width each, exactly 4 equal columns edge-to-edge).
- **3-Filter Grids** (e.g., Appointments, Customers without stage filter):
  - Mobile: `grid-cols-1`.
  - Tablet: `sm:grid-cols-2` (3rd item spans `sm:col-span-2 lg:col-span-1`).
  - Desktop (`lg:`): `lg:grid-cols-3` (33.333% width each, 3 equal columns edge-to-edge).
- **2-Filter Grids** (e.g., Invoices, Broadcasts, Services, Inventory actions):
  - Mobile: `grid-cols-1` (100% width stacked).
  - Tablet & Desktop: `sm:grid-cols-2` (50% width each, 2 equal columns edge-to-edge).

## 3. 2-Column Mobile Stat & Metric Cards (Fill-the-Row Rule)
- **2-Column Mobile Default**: Top KPI and metric cards must display in 2 columns on mobile (`grid-cols-2`).
- **Fill-the-Row Rule (Zero Orphaned Slots)**: When displaying an odd number of cards (3 or 5 cards):
  - Apply `col-span-1 last:col-span-2 sm:last:col-span-1` to expand the final card across both columns on mobile.
  - Never leave an odd card sitting alone with an empty empty slot beside it.
- **Metric Content Truncation**: Metric card labels and currency numbers must include `truncate` and `min-w-0` to eliminate horizontal overflow on compact viewports.

## 4. Filter Button Styling & Component Parity
- **Trigger Button Parity**: Date pickers (`DatePicker`) and dropdowns (`CustomDropdown`) inside toolbars must share identical visual metrics:
  - Height & Padding: `h-9 sm:h-10 px-3.5 sm:px-4`.
  - Typography: `text-xs font-bold font-sans`.
  - Border & Radius: `rounded-full border border-[#EAEAEA] bg-[#F4F7F4] hover:bg-[#EAEAEA]`.
  - State Indicators: Rotating `ChevronDown` (rotates 180° when open) and green active badge highlighting (`!bg-[#22C55E]/10 !border-[#22C55E]/30 !text-[#16281D]`).
- **Popover Boundary Shielding**:
  - Popovers, calendars, and menus must never clip or cause horizontal scrollbars on mobile.
  - Set `max-w-[calc(100vw-32px)]` and contextual horizontal anchoring (`align="left"` for left controls, `align="right"` for right controls).
- **Custom Date Range Responsiveness (Inline Desktop vs Stacked Mobile/Tablet)**:
  - **Desktop Viewports (`lg:` / 1024px+)**: When a custom date range is selected, the "From" and "To" date pickers MUST NOT open "at down" (stacked below). They must render 100% INLINE on the same horizontal row alongside the preset dropdown (`[Preset Dropdown] [From date...] to [To date...] [X]`). The entire toolbar row must remain on ONE single line without wrapping filters or date pickers into multi-row ladders.
  - **Mobile & Tablet Viewports (`< lg`)**: To prevent squishing or clipping on narrow viewports, date pickers ("From" and "To") stack on a dedicated full-width sub-row below the preset dropdown, each occupying 50% width with `!justify-between` triggers.

## 5. Always-On-Top Portaled Popovers & Zero Modal Scrolling Standard
- **Zero Modal DOM Scroll Inflation**:
  - Popovers, dropdown menus, date pickers, and time pickers must ALWAYS render via a React Portal attached directly to `document.body` (`createPortal(children, document.body)`).
  - PROHIBITION: Never render popovers inline using `position: absolute` within scrollable containers or modal dialog cards (`overflow-y: auto`, `overflow: hidden`). Inline absolute popovers inflate container `scrollHeight`, creating unwanted modal scrollbars and layout shifts.
- **Fixed Positioning & Viewport Collision Detection**:
  - Portaled popovers must use `position: fixed` with dynamic coordinates calculated from `triggerRef.current.getBoundingClientRect()`.
  - Collision Detection (Vertical Flipping): When `window.innerHeight - rect.bottom < estimatedHeight` and `rect.top > spaceBelow`, the popover must flip to open cleanly ABOVE the trigger (`bottom: window.innerHeight - rect.top + 6`).
  - Viewport Clamping: Horizontal coordinates must clamp within screen boundaries (`Math.max(12, Math.min(idealLeft, window.innerWidth - width - 12))`) to prevent horizontal overflow on mobile screens.
- **Z-Index Layering**:
  - Popovers must use `z-index: 99999` so they float cleanly on top of all modal backdrops (`z-[110]`), dialog headers, footers, and cards without clipping.
- **Scroll & Resize Tracking**:
  - Must attach captured scroll listeners (`window.addEventListener('scroll', updatePosition, true)`) so the popover remains locked to its trigger when scrolling inside nested modal containers.
  - If the trigger element scrolls out of the visible viewport, the popover must close automatically.

