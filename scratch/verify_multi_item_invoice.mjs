import assert from 'node:assert';
import { reconcileInvoicePayload } from '../backend/src/services/ai-agent-schema.js';
import { matchCatalogItems, detectAndGenerateFallbackInvoice } from '../backend/src/services/ai-catalog-matcher.js';
import { buildSystemPrompt } from '../backend/src/services/ai-prompt-builder.js';

console.log('=== Starting Multi-Item Invoice Verification ===\n');

// --- Test 1: reconcileInvoicePayload with multi-item payload ---
console.log('Test 1: reconcileInvoicePayload preserves multiple items and independent quantities');
const multiPayload = {
  name: 'Invoice for Kusal - Web Design & SEO',
  items: [
    { name: 'Starter Spark', quantity: 2, price: 1000 },
    { name: 'SEO Optimization', quantity: 1, price: 2500 }
  ],
  advance_amount: 1000
};
const customer = { id: 100, name: 'Kusal Sirimanna', phone: '+94712345678' };
const incomingText = 'Can I order 2 Starter Spark packages and 1 SEO Optimization?';
const replyText = 'Certainly! Here is your invoice.';

const reconciled = reconcileInvoicePayload(multiPayload, customer, incomingText, replyText);

assert.strictEqual(reconciled.items.length, 2, 'Should have 2 items');
assert.strictEqual(reconciled.items[0].name, 'Starter Spark');
assert.strictEqual(reconciled.items[0].quantity, 2, 'First item should have quantity 2');
assert.strictEqual(reconciled.items[0].price, 1000, 'First item unit price should be 1000');
assert.strictEqual(reconciled.items[1].name, 'SEO Optimization');
assert.strictEqual(reconciled.items[1].quantity, 1, 'Second item should have quantity 1');
assert.strictEqual(reconciled.items[1].price, 2500, 'Second item unit price should be 2500');
assert.strictEqual(reconciled.totalAmount, 4500, 'Total should be (2*1000) + (1*2500) = 4500');
console.log('✔ Test 1 Passed: Multi-item array correctly extracted and computed total = 4500\n');


// --- Test 2: Compound item string splitting ---
console.log('Test 2: Compound item splitting (e.g. "Starter Spark + SEO Optimization")');
const compoundPayload = {
  items: [
    { name: 'Starter Spark + SEO Optimization', quantity: 1, price: 3500 }
  ]
};

const reconciledCompound = reconcileInvoicePayload(compoundPayload, customer, incomingText, replyText);

assert.strictEqual(reconciledCompound.items.length, 2, 'Compound item should be split into 2 items');
assert.strictEqual(reconciledCompound.items[0].name, 'Starter Spark');
assert.strictEqual(reconciledCompound.items[1].name, 'SEO Optimization');
console.log('✔ Test 2 Passed: Compound items split successfully\n');


// --- Test 3: matchCatalogItems with multiple items ---
console.log('Test 3: matchCatalogItems matches each item independently from catalog');
const mockServiceCatalog = [
  { service_name: 'Web Design', package_name: 'Starter Spark', price: 1000, package_desc: '1 page website' },
  { service_name: 'SEO', package_name: 'SEO Optimization', price: 2500, package_desc: 'On-page SEO' },
  { service_name: 'Maintenance', package_name: 'Monthly Care', price: 1500, package_desc: 'Bug fixes' },
];

const mockPgClient = {
  query: async (sql) => {
    return { rows: mockServiceCatalog };
  }
};

const agentService = {
  agent_prefix: 'agt_test',
  business_type: 'service'
};

async function testCatalogMatching() {
  const catalogResult = await matchCatalogItems({
    agent: agentService,
    pgClient: mockPgClient,
    items: [
      { name: 'Starter Spark', quantity: 2, price: 0 },
      { name: 'SEO Optimization', quantity: 1, price: 0 }
    ],
    fullSearchText: 'Starter Spark and SEO Optimization',
    customerName: 'Kusal Sirimanna'
  });

  assert.strictEqual(catalogResult.items.length, 2, 'Should return 2 catalog matched items');
  assert.strictEqual(catalogResult.items[0].name, 'Starter Spark');
  assert.strictEqual(catalogResult.items[0].price, 1000, 'Matched catalog price 1000 for item 1');
  assert.strictEqual(catalogResult.items[0].quantity, 2);
  assert.strictEqual(catalogResult.items[1].name, 'SEO Optimization');
  assert.strictEqual(catalogResult.items[1].price, 2500, 'Matched catalog price 2500 for item 2');
  assert.strictEqual(catalogResult.items[1].quantity, 1);
  assert.strictEqual(catalogResult.totalAmount, 4500, 'Total should be 4500 (2*1000 + 1*2500)');
  assert(catalogResult.invoiceName.includes('Starter Spark & SEO Optimization'), 'Invoice name should list both items');
  console.log('✔ Test 3 Passed: Catalog matching resolved independent prices and correct sum total\n');
}


// --- Test 4: detectAndGenerateFallbackInvoice for multiple items ---
console.log('Test 4: detectAndGenerateFallbackInvoice detects multiple items in message');
async function testFallbackInvoice() {
  const replyWithMultiple = `Here is your invoice summary:
*Items:*
• Starter Spark (Qty: 1) - LKR 1,000
• Monthly Care (Qty: 1) - LKR 1,500
*Total Amount:* LKR 2,500
Please find your invoice attached.`;

  const fallbackAction = await detectAndGenerateFallbackInvoice({
    agent: agentService,
    customer,
    incomingText: 'I want Starter Spark and Monthly Care',
    replyText: replyWithMultiple,
    pgClient: mockPgClient
  });

  assert(fallbackAction, 'Fallback invoice action should be generated');
  assert.strictEqual(fallbackAction.action, 'create_invoice');
  assert.strictEqual(fallbackAction.items.length, 2, 'Fallback should capture both items');
  assert.strictEqual(fallbackAction.items[0].name, 'Starter Spark');
  assert.strictEqual(fallbackAction.items[1].name, 'Monthly Care');
  assert.strictEqual(fallbackAction.total_amount, 2500, 'Total amount should be 2500');
  console.log('✔ Test 4 Passed: Fallback accurately generated multi-item invoice\n');
}


// --- Test 5: Prompt builder instructions for multi-item orders ---
console.log('Test 5: Prompt builder includes multi-item order instructions');
const dummyAgent = {
  agent_prefix: 'agt_test',
  business_name: 'Acme Solutions',
  business_type: 'service',
  language: 'English',
  currency: 'LKR',
  communication_channel: 'whatsapp'
};

const prompt = buildSystemPrompt(dummyAgent, customer, 'Web Design');
assert(prompt.includes('MULTIPLE ITEMS / PACKAGES / ADD-ONS:'), 'Prompt must instruct on multiple items');
assert(prompt.includes('List EVERY item clearly in bullet points'), 'Prompt must require bullet points for all items');
assert(prompt.includes('total_amount MUST be the EXACT mathematical sum of all item line totals'), 'Prompt must require exact total sum');
assert(prompt.includes('"items":[{"name":"Item 1"'), 'Prompt must show multi-item action schema');
console.log('✔ Test 5 Passed: System prompt contains explicit multi-item instructions\n');

async function runAll() {
  await testCatalogMatching();
  await testFallbackInvoice();
  console.log('All 5 Multi-Item Invoice Verification Tests Passed Successfully! 🎉');
}

runAll().catch((err) => {
  console.error('Verification Failed:', err);
  process.exit(1);
});
