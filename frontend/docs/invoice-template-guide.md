# Invoice Template Adjustment Guide

This guide provides clear instructions for designing and adjusting invoice templates in the iDesign WhatsApp CRM system. Templates are typically PDF-compatible images or layouts (A4 size recommended: 595pt width x 842pt height). Use this to position elements like logos, text fields, and tables accurately for professional output. All measurements are in points (pt), where 1 inch = 72pt.

## Key Assumptions and Best Practices
- **Page Size**: A4 (595pt x 842pt). If using letter size, adjust to 612pt x 792pt.
- **Margins**: Uniform 72pt (1 inch) on all sides for printing compatibility.
  - Usable area: Width 595 - 144 = 451pt; Height 842 - 144 = 698pt.
- **Fonts**: Use sans-serif (e.g., Arial, 10-12pt for body, 18-24pt for headers).
- **Colors**: Black text (#000000) on white background; accents in blue (#007BFF).
- **Tools**: Design in tools like Adobe Illustrator, Canva, or Figma. Export as high-res PNG/PDF (300 DPI).
- **Upload**: Use the Settings page to upload templates. Ensure placeholders (e.g., [LOGO], [CUSTOMER_NAME]) are marked clearly.
- **Testing**: After upload, generate a sample invoice via Invoices page to verify positioning.
- **Common Errors to Avoid**: Overlapping elements, text outside margins, ignoring bleed for print (add 18pt if printing).

## Layout Structure
The invoice is divided into vertical sections. Positions are relative to the top-left of the page (0,0 at top-left corner). Y increases downward.

### 1. Header (Top Section: 72pt - 144pt from top)
   - Purpose: Company branding and invoice metadata.
   - Height: 72pt.
   - Elements:
     - Logo: Left-aligned, (72pt, 72pt) to (200pt, 144pt). Max size 128pt x 72pt.
     - Company Name: Right of logo, (220pt, 90pt), 18pt bold.
     - Invoice Title ("INVOICE"): Center, (227pt, 72pt), 24pt bold.
   - Adjustment Tip: Ensure logo scales without distortion; reserve space for long company names.

### 2. Agent Details (72pt - 108pt from top, right side)
   - Purpose: Agent contact info.
   - Position: (400pt, 72pt) to (523pt, 108pt). Width: 123pt.
   - Elements:
     - Agent Name: (400pt, 72pt), 12pt.
     - Contact/Email: Below, (400pt, 84pt), 10pt.
   - Adjustment Tip: Keep concise; truncate if needed, but test with longest names.

### 3. Invoice Details (Left side, below header: 144pt - 216pt from top)
   - Purpose: Invoice number, date, due date.
   - Position: (72pt, 144pt) to (250pt, 216pt). Width: 178pt.
   - Elements:
     - Invoice #: (72pt, 144pt), 12pt bold.
     - Date: (72pt, 162pt), 12pt.
     - Due Date: (72pt, 180pt), 12pt.
   - Adjustment Tip: Align left; use consistent date formats (e.g., YYYY-MM-DD).

### 4. Bill To (Customer Details: 144pt - 252pt from top, right side)
   - Purpose: Customer billing info.
   - Position: (300pt, 144pt) to (523pt, 252pt). Width: 223pt, Height: 108pt.
   - Elements:
     - Customer Name: (300pt, 144pt), 12pt bold.
     - Address: Below, (300pt, 162pt - 234pt), 10pt, multi-line.
     - Phone/Email: (300pt, 234pt - 252pt), 10pt.
   - Adjustment Tip: Allow 3-4 lines for address; wrap text automatically.

### 5. Content Positions (Items Table: 252pt - 540pt from top)
   - Purpose: Line items, quantities, prices, totals.
   - Position: Full width (72pt, 252pt) to (523pt, 540pt). Height: 288pt.
   - Sub-Sections:
     - Table Header: (72pt, 252pt) to (523pt, 288pt). Columns: Description (200pt), Qty (50pt), Unit Price (100pt), Total (81pt). 12pt bold.
     - Table Rows: Start at (72pt, 288pt), each row 18pt high. Up to 12 rows (max 216pt height).
     - Subtotals: Below table, (72pt, 504pt) to (523pt, 522pt).
       - Subtotal: (400pt, 504pt), 12pt.
       - Tax: (400pt, 510pt), 12pt.
       - Total: (400pt, 516pt), 14pt bold.
   - Adjustment Tip: Use borders (0.5pt gray); ensure columns sum to 431pt. Handle dynamic rows by reserving space.

### 6. Notes (Below table: 540pt - 576pt from top)
   - Purpose: Additional comments or terms.
   - Position: (72pt, 540pt) to (523pt, 576pt). Height: 36pt.
   - Elements: Free text, 10pt, left-aligned.
   - Adjustment Tip: Limit to 2-3 lines; italicize for emphasis.

### 7. Sale Details / Footer (Bottom: 576pt - 770pt from top)
   - Purpose: Payment info, signatures, disclaimers.
   - Position: (72pt, 576pt) to (523pt, 770pt). Height: 194pt.
   - Elements:
     - Bank Details: Left, (72pt, 576pt - 648pt), 10pt.
     - Terms: Center, (200pt, 648pt - 720pt), 9pt.
     - Signature Line: Right, (350pt, 720pt), "Signature: ________________ Date: __________".
   - Adjustment Tip: Keep footer fixed; ensure it fits within bottom margin.

## Margins and Bleed
- **Margins**: 72pt all sides (top: 0-72pt, bottom: 770-842pt, left/right: 0-72pt and 523-595pt).
- **Bleed**: If printing, extend colors/images 18pt beyond margins (e.g., background to -18pt).
- **Red Line Indicators**: In your design tool, use red dashed lines at 72pt margins to visualize boundaries.

[Download IDesign Invoice Template Guide](https://itvaqysqzdmwhucllktz.supabase.co/storage/v1/object/public/invoices/IDesign%20Invoice%20Template.png)
## Visual Diagram (ASCII Approximation)
```
+---------------------------------------------+  <- 0pt (Top)
|  [Margins: 72pt]                            |
|  Header (Logo | Title)     Agent Details    |  72-144pt
|  Invoice Details              Bill To       | 144-252pt
|  -----------------------------------------  |
|  | Description | Qty | Unit | Total |       | 252-540pt (Table)
|  | ... (rows)  | ... | ...  | ...   |       |
|  | Subtotal    |           |  $XXX  |       |
|  -----------------------------------------  |
|  Notes                                      | 540-576pt
|  Sale Details / Footer (Bank | Terms | Sig)  | 576-770pt
|                                             |
+---------------------------------------------+  <- 842pt (Bottom)
  ^ Left Margin 72pt                  Right Margin 72pt
```
![IDesign Invoice Template](https://itvaqysqzdmwhucllktz.supabase.co/storage/v1/object/public/invoices/IDesign%20Invoice%20Template.png)

## Adjustment Workflow
1. Open design tool and set page to A4.
2. Draw margin guides at 72pt.
3. Place elements using exact coordinates above.
4. Add placeholders: e.g., [LOGO], [INVOICE_NUMBER], [ITEMS_TABLE].
5. Export and upload via Settings > Invoice Template.
6. Test: Generate invoice for a sample order; check alignment in PDF preview.
7. Iterate: If elements shift, adjust positions by 6-12pt increments.

## Troubleshooting
- **Text Overflow**: Increase section height by 18pt; reduce font size.
- **Table Too Long**: Limit items to 10-12; add "Continued..." for more.
- **Mobile/WhatsApp View**: Ensure layout collapses well; test PDF attachment.
- **Supabase Integration**: Templates stored in `agents.invoice_template_path`; updates via upload function.

For questions, refer to InvoicesPage.tsx or contact support. This guide ensures compliant, professional invoices.

Last Updated: 2025-09-30