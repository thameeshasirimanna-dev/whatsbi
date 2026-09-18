# Biz Agentz SEO Architecture & Technical Indexing Specification

This document defines the search engine optimization (SEO) architecture, indexing strategies, metadata standards, structured data specifications, technical crawlability rules, and Core Web Vitals targets for Biz Agentz.

---

## 1. Indexing Strategy: Public vs Authenticated Surfaces

Biz Agentz divides its route hierarchy into two distinct indexing classifications:

### 1.1. Public Surface (Indexable)
The public landing page (`/`) is the primary public entry point. It must be fully indexable by search engine crawlers (Googlebot, Bingbot), optimized for organic discovery, and equipped with comprehensive metadata and structured data.

- **Route**: `/`
- **Indexing Directive**: `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1`
- **Target Keywords**: WhatsApp CRM, WhatsApp Business automation, WhatsApp sales pipeline, multi-tenant WhatsApp CRM, WhatsApp chatbot integration, WhatsApp order management.

### 1.2. Application Surfaces (Non-Indexable)
All internal workspaces, administrative consoles, login forms, and component test harnesses must be strictly prevented from being indexed to protect customer privacy and preserve search engine crawl budget.

- **Routes**:
  - `/login`
  - `/admin/*`
  - `/agent/*`
  - `/style-guide`
- **Indexing Directive**: `noindex, nofollow, noarchive, nosnippet`
- **HTTP Header**: `X-Robots-Tag: noindex, nofollow` emitted by the reverse proxy / server.
- **HTML Meta Tag**: `<meta name="robots" content="noindex, nofollow" />` dynamically injected on these views.

---

## 2. Document Metadata Architecture

The public landing page (`/`) must include the following standardized HTML head tags:

### 2.1. Standard HTML Meta Tags
```html
<title>Biz Agentz — Multi-Tenant WhatsApp Business CRM & Sales Automation</title>
<meta name="description" content="Scale your business on WhatsApp with Biz Agentz. Centralize chats, automate sales pipelines, generate instant PDF invoices, and integrate AI chatbots seamlessly." />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="charset" content="UTF-8" />
<meta name="theme-color" content="#0c1a0e" />
<link rel="canonical" href="https://bizagentz.com/" />
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
```

### 2.2. OpenGraph Protocol (Social Discovery)
Enables rich cards when links are shared across WhatsApp, LinkedIn, Twitter, and Slack:

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Biz Agentz" />
<meta property="og:url" content="https://bizagentz.com/" />
<meta property="og:title" content="Biz Agentz — Multi-Tenant WhatsApp Business CRM" />
<meta property="og:description" content="The modern WhatsApp CRM for growing businesses. Manage customer conversations, track orders, generate invoices, and automate with AI." />
<meta property="og:image" content="https://bizagentz.com/assets/og-cover.webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/webp" />
<meta property="og:locale" content="en_US" />
```

### 2.3. Twitter Card Tags
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Biz Agentz — Multi-Tenant WhatsApp Business CRM" />
<meta name="twitter:description" content="Convert WhatsApp conversations into revenue with multi-agent inbox, live order tracking, and AI automation." />
<meta name="twitter:image" content="https://bizagentz.com/assets/og-cover.webp" />
```

---

## 3. Structured Data (JSON-LD)

To qualify for Google Rich Results and establish entity knowledge graphing, the public landing page must embed Schema.org JSON-LD scripts:

### 3.1. SoftwareApplication Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Biz Agentz",
  "operatingSystem": "All",
  "applicationCategory": "BusinessApplication",
  "url": "https://bizagentz.com",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Multi-tenant WhatsApp Business CRM providing centralized chat management, order processing, and AI automation.",
  "featureList": [
    "WhatsApp Cloud API Integration",
    "Multi-Agent Inboxes",
    "Instant PDF Invoice Generation",
    "Order & Appointment Management",
    "AI Chatbot Handoff"
  ]
}
</script>
```

### 3.2. Organization & WebSite Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Biz Agentz",
  "url": "https://bizagentz.com",
  "logo": "https://bizagentz.com/assets/logo.webp",
  "sameAs": []
}
</script>
```

### 3.3. FAQPage Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Biz Agentz?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Biz Agentz is a multi-tenant WhatsApp Business CRM that connects directly with the Meta WhatsApp Cloud API to manage conversations, track customer pipeline stages, process orders, and connect AI chatbots."
      }
    },
    {
      "@type": "Question",
      "name": "Does Biz Agentz support multi-agent teams?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Biz Agentz provides complete tenant isolation for each agent with dedicated PostgreSQL dynamic tables, analytics, and contact lists."
      }
    }
  ]
}
</script>
```

---

## 4. Crawlability & Indexing Directives

### 4.1. `robots.txt` Specification
Located at the web root (`public/robots.txt`):

```txt
User-agent: *
Allow: /$
Allow: /assets/
Disallow: /admin/
Disallow: /agent/
Disallow: /login
Disallow: /style-guide
Disallow: /api/

Sitemap: https://bizagentz.com/sitemap.xml
```

### 4.2. `sitemap.xml` Specification
Located at the web root (`public/sitemap.xml`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bizagentz.com/</loc>
    <lastmod>2026-09-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

---

## 5. Technical SEO & Content Hierarchy

### 5.1. Semantic Heading Hierarchy
- **Single `<h1>` Rule**: The landing page must have exactly one `<h1>` element representing the primary value proposition (e.g., `Scale Your Business with Biz Agentz WhatsApp CRM`).
- **Logical Nesting**: Sections must follow strict semantic order (`<h1>` -> `<h2>` -> `<h3>`). Never skip levels for styling purposes.
- **No Pill Tags on Headings**: Do not wrap section titles in rounded pill badges or chip containers. Keep typography clean and prominent.

### 5.2. Semantic HTML Elements
- Use `<header>` for navigation and site banner.
- Use `<main id="main-content">` for primary landing content.
- Use `<section>` with `aria-labelledby` attributes for distinct content chapters.
- Use `<footer>` for corporate links, copyright, and secondary links.
- Interactive elements must possess unique `id` attributes for accessibility and browser verification.

### 5.3. Asset Formats & Web Performance
- **Format**: All raster images and graphics must use `.webp`.
- **Dimensions**: All `<img>` tags must declare explicit `width` and `height` attributes to prevent Cumulative Layout Shift (CLS).
- **Loading Behavior**: Above-the-fold hero images must specify `fetchpriority="high"`. Below-the-fold images must specify `loading="lazy"`.
- **Responsive Sizing**: Maximum desktop container width is constrained to `90vw`; mobile and tablet containers are constrained to `95vw`.

---

## 6. Core Web Vitals Targets

Biz Agentz adheres to Google's Core Web Vitals thresholds:

| Metric | Target | Optimization Strategy |
|---|---|---|
| **Largest Contentful Paint (LCP)** | `< 2.5s` | Preload hero fonts (`Syne`, `DM Sans`), serve WebP images, avoid render-blocking scripts. |
| **Interaction to Next Paint (INP)** | `< 200ms` | Debounce scroll handlers, optimize React component re-renders, use CSS transitions for layout. |
| **Cumulative Layout Shift (CLS)** | `< 0.1` | Explicit aspect ratios on all cards and image wrappers; no dynamic content injection above viewport. |
