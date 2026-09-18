# Biz Agentz Documentation Hub

Welcome to the central documentation hub for **Biz Agentz**, a multi-tenant WhatsApp Business CRM.

All project architecture, specifications, style guidelines, database structure, SEO architecture, and test cases are maintained within this directory.

---

## Documentation Index

### 1. Product & Architecture
- **[Product Overview](product.md)**
  Vision, target users (business agents and admins), brand personality, anti-references, and design principles.
- **[Product Architecture & Structure](product-structure.md)**
  Complete system overview, technology stack, backend services, frontend module layout, API endpoints, real-time messaging, and multi-tenancy model.

### 2. Database & Data Model
- **[Database Architecture](database-architecture.md)**
  Full PostgreSQL data architecture: multi-tenant dynamic table isolation (`{prefix}_*`), global system tables, all 13 dynamic tenant tables, enums, triggers, stored procedures, RLS security policies, performance indexes, migration ledger (001-039), and entity-relationship diagram.

### 3. Design System & Frontend
- **[Design Foundations](design.md)**
  Visual theme, dark forest and light mint surfaces, typography (Syne display, DM Sans body), animation curves, and elevation tokens.
- **[Component Style Guide](style-guide.md)**
  Complete UI component design system: color token definitions, buttons, cards, form inputs, navigation bars, data tables, modals, badges, layout max-width constraints (90vw desktop, 95vw mobile), and responsive rules.

### 4. Search Engine Optimization (SEO)
- **[SEO Architecture](seo-architecture.md)**
  Public vs authenticated route indexing strategy, document meta tags, OpenGraph protocol, Twitter Cards, JSON-LD structured data (SoftwareApplication, Organization, WebSite, FAQPage), Core Web Vitals targets, WebP image requirements, semantic HTML structure, robots.txt, and sitemap.xml.

### 5. Quality Assurance & Testing
- **[Test Cases](test-cases.md)**
  Comprehensive test suite matrix for manual test execution: backend authentication, tenant isolation, WhatsApp webhook processing, CRM APIs, media proxy, responsive viewport compliance, and frontend flows. Includes test execution protocol and manual runbooks.

### 6. Migrations & Legacy Reports
- **[Edge Functions Classification](edge-functions-classification.md)**
  Supabase Edge Functions classification and backend migration priority matrix.
- **[Supabase REST Scan Report](supabase-rest-scan-report.md)**
  Historical scan of direct Supabase REST usage and migration tracking.

---

## Directory Conventions

- **Document Location**: All specifications reside in `/docs` (aliased to `/doc`).
- **Planning Documents**: Architectural roadmaps and RFC plans reside in `/plans`.
- **Global Standards**:
  - No credentials in code or documentation (use `.env` and environment variables).
  - No emoji icons in code or documentation.
  - Image assets must use the WebP format.
  - Desktop viewports constrained to `90vw` max width; mobile/tablet constrained to `95vw` max width.
  - All test cases are executed manually by human operators.
