import { parseJsonUrls } from './ai-formatters.js';

/**
 * Fetches and builds catalog context (services or products) for the AI agent
 */
export async function fetchCatalogContext({
  agent,
  pgClient,
}: {
  agent: any;
  pgClient: any;
}): Promise<string> {
  let catalogContext = '';

  if (agent.business_type === 'service') {
    try {
      const { rows: services } = await pgClient.query(
        "SELECT * FROM get_agent_services($1, null, null, 'created_at', 'desc')",
        [agent.id]
      );

      if (services && services.length > 0) {
        catalogContext = 'Services & Packages Offered:\n' + services.map((s: any) => {
          let text = `- Service: ${s.service_name}\n  Description: ${s.description || 'Professional service'}`;
          const links = parseJsonUrls(s.service_links);
          if (links.length > 0) {
            text += `\n  Sample Work & Portfolio Links: ${links.join(', ')}`;
          }
          const images = parseJsonUrls(s.image_urls);
          if (images.length > 0) {
            text += `\n  Sample Work Photos: Available (${images.length} sample photo(s))`;
          }
          if (Array.isArray(s.packages) && s.packages.length > 0) {
            const pkgs = s.packages.map((p: any) => {
              const pkgDesc = p.description ? ` | Details: ${p.description.replace(/\n+/g, '; ')}` : '';
              return `    * Package: ${p.package_name} | Price: ${p.currency || 'Rs.'} ${p.price || 'N/A'}${pkgDesc}`;
            }).join('\n');
            text += '\n' + pkgs;
          }
          return text;
        }).join('\n\n');
      }
    } catch (catalogErr) {
      console.warn('[DeepSeek AI] get_agent_services failed, falling back to direct table query:', catalogErr);
      const servicesTable = `${agent.agent_prefix}_services`;
      const packagesTable = `${agent.agent_prefix}_service_packages`;
      try {
        const { rows: services } = await pgClient.query(`
          SELECT s.id, s.service_name, s.description, s.image_urls, s.service_links,
                 p.package_name, p.price, p.currency, p.description as package_desc
          FROM ${servicesTable} s
          LEFT JOIN ${packagesTable} p ON s.id = p.service_id
          WHERE s.is_active = true OR s.is_active IS NULL
          ORDER BY s.id ASC
          LIMIT 50
        `);

        if (services.length > 0) {
          catalogContext = 'Services Offered:\n' + services.map((s: any) => {
            const pkg = s.package_name ? ` (Tier: ${s.package_name}, Price: ${s.currency || 'Rs.'} ${s.price || 'N/A'})` : '';
            let text = `- ${s.service_name}${pkg}: ${s.description || s.package_desc || 'Professional service'}`;
            const links = parseJsonUrls(s.service_links);
            if (links.length > 0) {
              text += ` | Sample Links: ${links.join(', ')}`;
            }
            const images = parseJsonUrls(s.image_urls);
            if (images.length > 0) {
              text += ` | Sample Photos: Available (${images.length})`;
            }
            return text;
          }).join('\n');
        }
      } catch (fallbackErr) {
        console.error('[DeepSeek AI] Direct services query failed:', fallbackErr);
      }
    }
  } else {
    // Default to product business
    const itemsTable = `${agent.agent_prefix}_inventory_items`;
    const categoriesTable = `${agent.agent_prefix}_categories`;
    try {
      const { rows: products } = await pgClient.query(`
        SELECT i.id, i.name, i.sku, i.price, i.stock_status, c.name as category_name, i.description
        FROM ${itemsTable} i
        LEFT JOIN ${categoriesTable} c ON i.category_id = c.id
        WHERE i.is_active = true OR i.is_active IS NULL
        ORDER BY i.id ASC
        LIMIT 50
      `);

      if (products.length > 0) {
        catalogContext = 'Product Catalog:\n' + products.map((p: any) => {
          const sku = p.sku ? ` [SKU: ${p.sku}]` : '';
          const cat = p.category_name ? ` (Category: ${p.category_name})` : '';
          const stock = p.stock_status ? ` - Status: ${p.stock_status}` : '';
          const desc = p.description ? ` - ${p.description}` : '';
          return `- ${p.name}${sku}${cat}: Rs. ${p.price || '0.00'}${stock}${desc}`;
        }).join('\n');
      }
    } catch (catalogErr) {
      console.error('[DeepSeek AI] Error fetching product catalog:', catalogErr);
    }
  }

  return catalogContext;
}
