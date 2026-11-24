import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRecommendationBadges,
  calculateTotalCost,
  checkPcBuildCompatibility,
  computeBuySmartScore,
  computePriceStats,
  convertCurrency,
  evaluateShoppingSafety,
} from './scoring';
import type { Product } from '../shared/types';

test('computeBuySmartScore computes weighted score and reports missing evidence honestly', () => {
  const full = computeBuySmartScore({
    category: 'smartphones',
    performanceScore: 86,
    performanceEvidence: 'Snapdragon 7+ Gen 3 benchmarked',
    price: 18999,
    budget: 20000,
    valueEvidence: 'Within 95% of budget',
    requirementsMatchScore: 90,
    requirementsEvidence: 'Meets 5G + AMOLED + 5000mAh requirements',
    reliabilityScore: 84,
    reliabilityEvidence: '2+ years OS update commitment',
    rating: 4.5,
    reviewCount: 1200,
    warrantyMonths: 12,
    warrantyEvidence: '1 year manufacturer warranty',
  });
  assert.equal(full.confidence, 'High');
  assert.equal(full.missingEvidence.length, 0);
  assert.ok(full.total >= 80 && full.total <= 95);

  const partial = computeBuySmartScore({
    category: 'electronics',
    performanceScore: null,
    performanceEvidence: 'Not benchmarked',
    price: 15000,
    valueEvidence: 'Observed merchant listing',
    requirementsMatchScore: 78,
    requirementsEvidence: 'Partial keyword match',
    reliabilityScore: null,
    reliabilityEvidence: 'Unknown',
    rating: null,
    reviewCount: null,
    warrantyMonths: null,
    warrantyEvidence: 'Not disclosed',
  });
  assert.equal(partial.confidence, 'Low');
  assert.ok(partial.missingEvidence.length >= 3);
  assert.ok(partial.dimensions.some((d) => d.missing === true && d.score === null));
});

test('calculateTotalCost includes shipping and estimated taxes cleanly', () => {
  const res = calculateTotalCost(20000, 199, 0.18);
  assert.equal(res.estimatedTax, 3600);
  assert.equal(res.totalCost, 23799);
});

test('computePriceStats classifies competitive vs wait_recommended vs insufficient_history', () => {
  const insufficient = computePriceStats([{ date: '2026-11-01', price: 19999, merchant: 'Amazon' }], 19999);
  assert.equal(insufficient.guidance, 'insufficient_history');

  const history = [
    { date: '2026-10-01', price: 22000, merchant: 'Amazon' },
    { date: '2026-10-15', price: 21500, merchant: 'Amazon' },
    { date: '2026-11-01', price: 21000, merchant: 'Amazon' },
  ];
  const competitive = computePriceStats(history, 18999);
  assert.equal(competitive.guidance, 'competitive');

  const waitRec = computePriceStats(history, 24500);
  assert.equal(waitRec.guidance, 'wait_recommended');
});

test('evaluateShoppingSafety flags abnormal discounts and unverified domains', () => {
  const safe = evaluateShoppingSafety({
    discountPct: 12,
    warranty: '1 Year Manufacturer Warranty',
    verifiedSource: true,
  }, 'Complete verified product listing with model number.');
  assert.equal(safe.riskLevel, 'Low');

  const risky = evaluateShoppingSafety({
    discountPct: 78,
    warranty: 'Unknown',
    verifiedSource: false,
  }, 'Short');
  assert.equal(risky.riskLevel, 'Elevated');
  assert.ok(risky.indicators.length >= 3);
});

test('checkPcBuildCompatibility catches socket and PSU mismatches', () => {
  const mismatch = checkPcBuildCompatibility([
    { slot: 'CPU', specs: { Socket: 'AM5' } },
    { slot: 'Motherboard', specs: { Socket: 'LGA1700', 'Memory Type': 'DDR5' } },
    { slot: 'RAM', specs: { Type: 'DDR4' } },
    { slot: 'GPU', specs: { 'Recommended PSU': '650W' } },
    { slot: 'PSU', specs: { Wattage: '450W' } },
  ]);
  assert.equal(mismatch.compatible, false);
  assert.equal(mismatch.warnings.length, 3);

  const ok = checkPcBuildCompatibility([
    { slot: 'CPU', specs: { Socket: 'AM4' } },
    { slot: 'Motherboard', specs: { Socket: 'AM4', 'Memory Type': 'DDR4' } },
    { slot: 'RAM', specs: { Type: 'DDR4' } },
    { slot: 'GPU', specs: { 'Recommended PSU': '550W' } },
    { slot: 'PSU', specs: { Wattage: '650W' } },
  ]);
  assert.equal(ok.compatible, true);
  assert.equal(ok.warnings.length, 0);
});

test('convertCurrency converts accurately across INR and USD', () => {
  const usd = convertCurrency(50000, 'INR', 'USD');
  assert.equal(usd, 600);
});

test('assignRecommendationBadges assigns distinct category badges', () => {
  const base = (id: string, total: number, price: number): Product => ({
    id,
    title: id,
    brand: 'Test',
    category: 'smartphones',
    variant: '128GB',
    imageUrl: '',
    summary: '',
    specs: {},
    pros: [],
    cons: [],
    aiExplanation: '',
    rating: 4.4,
    reviewCount: 100,
    offers: [
      {
        merchant: 'Amazon',
        domain: 'amazon.in',
        price,
        shippingCost: 0,
        estimatedTax: 0,
        totalCost: price,
        currency: 'INR',
        inStock: true,
        sellerName: 'Retail',
        warranty: '1 Year',
        deliveryEstimate: '2 days',
        url: 'https://www.amazon.in',
        retrievedAt: '2026-11-23T00:00:00Z',
        verifiedSource: true,
      },
    ],
    score: {
      total,
      confidence: 'High',
      missingEvidence: [],
      dimensions: [
        { key: 'value', label: 'Value', weight: 25, score: total === 85 ? 95 : 80, evidence: '' },
        { key: 'reliability', label: 'Reliability', weight: 10, score: 85, evidence: '' },
      ],
    },
    priceHistory: [],
    priceStats: {
      current: price,
      lowest: price,
      highest: price,
      average: price,
      guidance: 'competitive',
      guidanceText: '',
      discountPattern: '',
    },
    reviewSummary: {
      sampleSize: 100,
      sampleDate: '2026-11-23',
      averageRating: 4.4,
      pros: [],
      cons: [],
      durabilityFeedback: '',
      serviceComplaints: [],
      commonMisunderstandings: [],
      positiveVsNegativeDiff: '',
      authenticityEstimate: { label: 'High Organic Signal', confidenceNote: '' },
    },
    safety: { riskLevel: 'Low', indicators: [], disclaimer: '' },
    retrievedAt: '2026-11-23T00:00:00Z',
  });

  const badged = assignRecommendationBadges([
    base('p1', 91, 24000),
    base('p2', 85, 18000),
    base('p3', 78, 12000),
  ]);
  assert.equal(badged.find((p) => p.id === 'p1')?.score.recommendationCategory, 'Best overall');
  assert.equal(badged.find((p) => p.id === 'p2')?.score.recommendationCategory, 'Best value for money');
  assert.equal(badged.find((p) => p.id === 'p3')?.score.recommendationCategory, 'Best budget option');
});
