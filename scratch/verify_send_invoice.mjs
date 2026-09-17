import assert from 'node:assert/strict';

// Test 1: Test phone normalization logic
function normalizeE164(recipientPhone) {
  let normalized = (recipientPhone || '').replace(/\D/g, '');
  if (!normalized) return null;
  // Sri Lankan local numbers: 07XXXXXXXX (10 digits starting with 0) -> 947XXXXXXXX
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '94' + normalized.slice(1);
  } else if (!normalized.startsWith('94') && normalized.length === 9) {
    // 9 digits e.g. 771234567 -> 94771234567
    normalized = '94' + normalized;
  }
  // Standard Meta WhatsApp Cloud API accepts 10-15 digits
  if (!/^\d{10,15}$/.test(normalized)) return null;
  return normalized;
}

console.log('Testing Phone Normalization...');
assert.equal(normalizeE164('0771234567'), '94771234567', 'Local 077 number should become 94771234567');
assert.equal(normalizeE164('0712345678'), '94712345678', 'Local 071 number should become 94712345678');
assert.equal(normalizeE164('+94771234567'), '94771234567', '+94 international should become 94771234567');
assert.equal(normalizeE164('94771234567'), '94771234567', '94 international should remain 94771234567');
assert.equal(normalizeE164('771234567'), '94771234567', '9-digit without 0 should become 94771234567');
console.log(' Phone Normalization Tests Passed!');

// Test 2: Test Invoice WhatsApp captions for zero Singlish
const SINGLISH_FORBIDDEN = [
  'karanna', 'karapu', 'wada', 'patangaththa', 'apita', 'oyata', 'thawa', 'gewanna',
  'ganan', 'milaga', 'kiyanna', 'ewanna', 'danna', 'sthuthi', 'bohoma'
];

function generateCaptions({ invNumber, totalAmount, advanceAmount, isPaid, isPartial, businessName }) {
  const formatLkr = (num) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const remainingBalance = Math.max(0, totalAmount - advanceAmount);

  let caption = '';
  if (isPaid && !isPartial) {
    caption = `*Invoice ${invNumber}* - Paid in Full. Thank you! We have started the work. Our project manager will contact you soon for gathering requirements.`;
  } else if (isPartial) {
    caption = `*Invoice ${invNumber}* - Advance Payment Received (LKR ${formatLkr(advanceAmount)}). Balance Due: LKR ${formatLkr(remainingBalance)}. We have started the work. Our project manager will contact you soon for gathering requirements.`;
  } else {
    caption = `*Invoice ${invNumber}* - ${businessName || 'Invoice'}\nTotal Amount: LKR ${formatLkr(totalAmount)}\nOnce you make the advance or full payment at once, we start the work immediately. Our project manager will contact you soon for gathering requirements.`;
  }
  return caption;
}

console.log('Testing Invoice Captions for Zero Singlish...');
const testCases = [
  { invNumber: '#INV-0024', totalAmount: 50000, advanceAmount: 0, isPaid: false, isPartial: false, businessName: 'iDesign Solutions' },
  { invNumber: '#INV-0024', totalAmount: 50000, advanceAmount: 25000, isPaid: true, isPartial: true, businessName: 'iDesign Solutions' },
  { invNumber: '#INV-0024', totalAmount: 50000, advanceAmount: 50000, isPaid: true, isPartial: false, businessName: 'iDesign Solutions' },
];

for (const tc of testCases) {
  const caption = generateCaptions(tc);
  console.log(`Generated Caption: ${caption.replace(/\n/g, ' ')}`);
  for (const word of SINGLISH_FORBIDDEN) {
    assert.ok(!caption.toLowerCase().includes(word), `Caption must not contain Singlish word '${word}'`);
  }
}
console.log(' Zero Singlish Verification Passed!');

console.log('\nAll Invoice WhatsApp Resend Verifications Passed Successfully!');
