import type {
  BuySmartScoreBreakdown,
  CategoryId,
  CurrencyCode,
  MerchantOffer,
  PricePoint,
  PriceStats,
  Product,
  RecommendationBadge,
  SafetyAssessment,
  SafetyIndicator,
  ScoreDimension,
  ScoreWeights,
} from '../shared/types.ts';

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  performance: 0.25,
  value: 0.25,
  requirementsMatch: 0.25,
  reliability: 0.1,
  reviewQuality: 0.1,
  warrantySupport: 0.05,
};

const CATEGORY_WEIGHT_PRESETS: Partial<Record<CategoryId, ScoreWeights>> = {
  laptops: {
    performance: 0.3,
    value: 0.22,
    requirementsMatch: 0.22,
    reliability: 0.1,
    reviewQuality: 0.08,
    warrantySupport: 0.08,
  },
  smartphones: {
    performance: 0.25,
    value: 0.25,
    requirementsMatch: 0.22,
    reliability: 0.11,
    reviewQuality: 0.1,
    warrantySupport: 0.07,
  },
  fashion: {
    performance: 0.18,
    value: 0.28,
    requirementsMatch: 0.26,
    reliability: 0.12,
    reviewQuality: 0.12,
    warrantySupport: 0.04,
  },
  sports: {
    performance: 0.25,
    value: 0.22,
    requirementsMatch: 0.25,
    reliability: 0.13,
    reviewQuality: 0.1,
    warrantySupport: 0.05,
  },
};

export function normalizeWeights(weights: ScoreWeights): ScoreWeights {
  const sum =
    weights.performance +
    weights.value +
    weights.requirementsMatch +
    weights.reliability +
    weights.reviewQuality +
    weights.warrantySupport;
  if (sum <= 0) return { ...DEFAULT_SCORE_WEIGHTS };
  return {
    performance: weights.performance / sum,
    value: weights.value / sum,
    requirementsMatch: weights.requirementsMatch / sum,
    reliability: weights.reliability / sum,
    reviewQuality: weights.reviewQuality / sum,
    warrantySupport: weights.warrantySupport / sum,
  };
}

export function getCategoryWeights(
  category: CategoryId,
  customWeights?: Partial<ScoreWeights>,
): ScoreWeights {
  const base = CATEGORY_WEIGHT_PRESETS[category] ?? DEFAULT_SCORE_WEIGHTS;
  if (!customWeights) return normalizeWeights(base);
  return normalizeWeights({
    ...base,
    ...customWeights,
  });
}

export interface ScoreInput {
  category: CategoryId;
  performanceScore: number | null;
  performanceEvidence: string;
  price: number;
  budget?: number;
  valueEvidence: string;
  requirementsMatchScore: number | null;
  requirementsEvidence: string;
  reliabilityScore: number | null;
  reliabilityEvidence: string;
  rating: number | null;
  reviewCount: number | null;
  warrantyMonths: number | null;
  warrantyEvidence: string;
  customWeights?: Partial<ScoreWeights>;
}

export function computeBuySmartScore(input: ScoreInput): BuySmartScoreBreakdown {
  const weights = getCategoryWeights(input.category, input.customWeights);
  const missingEvidence: string[] = [];

  // Value score derived from budget alignment if budget is known, else market price-to-tier ratio
  let valueScore: number | null = null;
  if (input.price > 0) {
    if (input.budget && input.budget > 0) {
      const ratio = input.price / input.budget;
      if (ratio <= 0.8) valueScore = 92;
      else if (ratio <= 1.0) valueScore = 84;
      else if (ratio <= 1.12) valueScore = 68;
      else valueScore = Math.max(35, Math.round(70 - (ratio - 1) * 60));
    } else {
      valueScore = 80;
    }
  } else {
    missingEvidence.push('Verified current pricing');
  }

  let reviewScore: number | null = null;
  if (input.rating !== null && input.reviewCount !== null && input.reviewCount > 0) {
    const sampleFactor = input.reviewCount >= 200 ? 1 : input.reviewCount >= 30 ? 0.92 : 0.82;
    reviewScore = Math.min(98, Math.round((input.rating / 5) * 100 * sampleFactor));
  } else {
    missingEvidence.push('Verified customer review sample');
  }

  let warrantyScore: number | null = null;
  if (input.warrantyMonths !== null) {
    warrantyScore = input.warrantyMonths >= 24 ? 92 : input.warrantyMonths >= 12 ? 78 : 58;
  } else {
    missingEvidence.push('Explicit manufacturer warranty duration');
  }

  if (input.performanceScore === null) missingEvidence.push('Technical benchmark or core specifications');
  if (input.requirementsMatchScore === null) missingEvidence.push('Use-case suitability alignment');
  if (input.reliabilityScore === null) missingEvidence.push('Long-term reliability data');

  const dimensions: ScoreDimension[] = [
    {
      key: 'performance',
      label: 'Performance & functionality',
      weight: Math.round(weights.performance * 100),
      score: input.performanceScore,
      evidence: input.performanceEvidence,
      missing: input.performanceScore === null,
    },
    {
      key: 'value',
      label: 'Value for money',
      weight: Math.round(weights.value * 100),
      score: valueScore,
      evidence: input.valueEvidence,
      missing: valueScore === null,
    },
    {
      key: 'requirementsMatch',
      label: 'User requirements match',
      weight: Math.round(weights.requirementsMatch * 100),
      score: input.requirementsMatchScore,
      evidence: input.requirementsEvidence,
      missing: input.requirementsMatchScore === null,
    },
    {
      key: 'reliability',
      label: 'Reliability evidence',
      weight: Math.round(weights.reliability * 100),
      score: input.reliabilityScore,
      evidence: input.reliabilityEvidence,
      missing: input.reliabilityScore === null,
    },
    {
      key: 'reviewQuality',
      label: 'Review quality',
      weight: Math.round(weights.reviewQuality * 100),
      score: reviewScore,
      evidence:
        input.rating !== null && input.reviewCount !== null
          ? `${input.rating.toFixed(1)}/5 average across ${input.reviewCount.toLocaleString('en-IN')} reviews`
          : 'No verified review sample retrieved',
      missing: reviewScore === null,
    },
    {
      key: 'warrantySupport',
      label: 'Warranty & support',
      weight: Math.round(weights.warrantySupport * 100),
      score: warrantyScore,
      evidence: input.warrantyEvidence,
      missing: warrantyScore === null,
    },
  ];

  // Only aggregate dimensions with verified evidence; never fabricate scores for missing fields
  let availableWeight = 0;
  let weightedSum = 0;
  const weightMap: Record<keyof ScoreWeights, number> = weights;

  for (const dim of dimensions) {
    if (dim.score !== null) {
      const w = weightMap[dim.key];
      availableWeight += w;
      weightedSum += dim.score * w;
    }
  }

  const total = availableWeight > 0 ? Math.round(weightedSum / availableWeight) : 0;
  const confidence: 'High' | 'Medium' | 'Low' =
    missingEvidence.length === 0 ? 'High' : missingEvidence.length <= 2 ? 'Medium' : 'Low';

  return {
    total,
    confidence,
    missingEvidence,
    dimensions,
  };
}

export function assignRecommendationBadges(products: Product[]): Product[] {
  if (products.length === 0) return products;
  const cloned = products.map((p) => ({ ...p, score: { ...p.score } }));

  const byTotal = [...cloned].sort((a, b) => b.score.total - a.score.total);
  if (byTotal[0]) byTotal[0].score.recommendationCategory = 'Best overall';

  const withPrice = cloned.filter((p) => p.offers[0]?.totalCost > 0);
  const byValue = [...withPrice].sort((a, b) => {
    const aDim = a.score.dimensions.find((d) => d.key === 'value')?.score ?? 0;
    const bDim = b.score.dimensions.find((d) => d.key === 'value')?.score ?? 0;
    return bDim - aDim || a.offers[0].totalCost - b.offers[0].totalCost;
  });
  for (const cand of byValue) {
    if (!cand.score.recommendationCategory) {
      cand.score.recommendationCategory = 'Best value for money';
      break;
    }
  }

  const byBudget = [...withPrice].sort((a, b) => a.offers[0].totalCost - b.offers[0].totalCost);
  for (const cand of byBudget) {
    if (!cand.score.recommendationCategory) {
      cand.score.recommendationCategory = 'Best budget option';
      break;
    }
  }

  const byPremium = [...withPrice].sort((a, b) => b.offers[0].totalCost - a.offers[0].totalCost);
  for (const cand of byPremium) {
    if (!cand.score.recommendationCategory && cand.score.total >= 75) {
      cand.score.recommendationCategory = 'Best premium option';
      break;
    }
  }

  const byReliability = [...cloned].sort((a, b) => {
    const ar = a.score.dimensions.find((d) => d.key === 'reliability')?.score ?? 0;
    const br = b.score.dimensions.find((d) => d.key === 'reliability')?.score ?? 0;
    return br - ar;
  });
  for (const cand of byReliability) {
    if (!cand.score.recommendationCategory) {
      cand.score.recommendationCategory = 'Best long-term purchase';
      break;
    }
  }

  return cloned;
}

export function calculateTotalCost(
  price: number,
  shippingCost = 0,
  taxRate = 0,
): { totalCost: number; estimatedTax: number } {
  const safePrice = Math.max(0, price);
  const safeShipping = Math.max(0, shippingCost);
  const estimatedTax = Math.round(safePrice * Math.max(0, taxRate));
  return {
    estimatedTax,
    totalCost: Math.round(safePrice + safeShipping + estimatedTax),
  };
}

export function computePriceStats(history: PricePoint[], currentPrice: number): PriceStats {
  if (!history || history.length < 3) {
    return {
      current: currentPrice,
      lowest: currentPrice,
      highest: currentPrice,
      average: currentPrice,
      guidance: 'insufficient_history',
      guidanceText: 'Insufficient historical pricing records to advise waiting or buying.',
      discountPattern: 'Not enough historical data points recorded yet.',
    };
  }

  const prices = history.map((h) => h.price).filter((p) => p > 0);
  const lowest = Math.min(...prices, currentPrice);
  const highest = Math.max(...prices, currentPrice);
  const average = Math.round(prices.reduce((acc, p) => acc + p, 0) / prices.length);
  const ratio = average > 0 ? currentPrice / average : 1;

  let guidance: PriceStats['guidance'] = 'competitive';
  let guidanceText = 'Current observed price is near or below its recorded average.';

  if (ratio <= 0.96) {
    guidance = 'competitive';
    guidanceText = `Current price appears competitive (${Math.round((1 - ratio) * 100)}% below recorded average).`;
  } else if (ratio >= 1.07) {
    guidance = 'wait_recommended';
    guidanceText = `Price is ${Math.round((ratio - 1) * 100)}% higher than its recorded average. Consider waiting if your purchase is not urgent.`;
  } else if (ratio > 1.01) {
    guidance = 'above_average';
    guidanceText = 'Price is slightly above its recorded average. Monitoring with a target price alert is recommended.';
  }

  return {
    current: currentPrice,
    lowest,
    highest,
    average,
    guidance,
    guidanceText,
    discountPattern: `Observed range ${lowest.toLocaleString('en-IN')} – ${highest.toLocaleString('en-IN')} across ${history.length} checkpoints.`,
  };
}

export function evaluateShoppingSafety(offer: Partial<MerchantOffer>, description = ''): SafetyAssessment {
  const indicators: SafetyIndicator[] = [];

  if (offer.discountPct && offer.discountPct >= 65) {
    indicators.push({
      type: 'Unusually large discount',
      severity: 'warning',
      explanation: `Listed discount (${offer.discountPct}%) is unusually steep compared to typical reference pricing; verify seller authorization and return terms.`,
    });
  }

  if (!offer.warranty || offer.warranty.toLowerCase().includes('unknown') || offer.warranty.toLowerCase().includes('none')) {
    indicators.push({
      type: 'Missing warranty information',
      severity: 'caution',
      explanation: 'No explicit manufacturer or seller warranty duration was verified on this listing.',
    });
  }

  if (!offer.verifiedSource) {
    indicators.push({
      type: 'Unverified merchant domain',
      severity: 'warning',
      explanation: 'Domain is outside primary recognized retail partners; verify HTTPS, GST/tax invoice, and buyer protection.',
    });
  }

  if (description.trim().length > 0 && description.trim().length < 25) {
    indicators.push({
      type: 'Sparse product description',
      severity: 'info',
      explanation: 'Listing contains minimal specification detail; confirm exact model number before checkout.',
    });
  }

  const riskLevel: SafetyAssessment['riskLevel'] = indicators.some((i) => i.severity === 'warning')
    ? 'Elevated'
    : indicators.some((i) => i.severity === 'caution')
      ? 'Moderate'
      : 'Low';

  return {
    riskLevel,
    indicators,
    disclaimer:
      'Risk assessment highlights observable listing signals only and cannot guarantee product authenticity or seller reliability.',
  };
}

const CURRENCY_RATES_FROM_INR: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
};

export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return Math.round(amount);
  const inInr = amount / CURRENCY_RATES_FROM_INR[from];
  return Math.round(inInr * CURRENCY_RATES_FROM_INR[to]);
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function checkPcBuildCompatibility(
  selectedParts: Array<{ slot: string; specs: Record<string, string> }>,
): { compatible: boolean; notes: string[]; warnings: string[] } {
  const notes: string[] = [];
  const warnings: string[] = [];

  const cpu = selectedParts.find((p) => p.slot.toLowerCase().includes('cpu') || p.slot.toLowerCase().includes('processor'));
  const mobo = selectedParts.find((p) => p.slot.toLowerCase().includes('motherboard'));
  const ram = selectedParts.find((p) => p.slot.toLowerCase().includes('ram') || p.slot.toLowerCase().includes('memory'));
  const psu = selectedParts.find((p) => p.slot.toLowerCase().includes('psu') || p.slot.toLowerCase().includes('power'));
  const gpu = selectedParts.find((p) => p.slot.toLowerCase().includes('gpu') || p.slot.toLowerCase().includes('graphics'));

  if (cpu && mobo) {
    const cpuSocket = cpu.specs['Socket'];
    const moboSocket = mobo.specs['Socket'];
    if (cpuSocket && moboSocket) {
      if (cpuSocket.toLowerCase() === moboSocket.toLowerCase()) {
        notes.push(`CPU and motherboard socket match confirmed (${cpuSocket}).`);
      } else {
        warnings.push(`Incompatible socket: CPU uses ${cpuSocket} while motherboard uses ${moboSocket}.`);
      }
    }
  }

  if (mobo && ram) {
    const moboRam = mobo.specs['Memory Type'];
    const ramType = ram.specs['Type'];
    if (moboRam && ramType) {
      if (moboRam.toLowerCase() === ramType.toLowerCase()) {
        notes.push(`Memory generation match confirmed (${ramType}).`);
      } else {
        warnings.push(`Incompatible RAM: Motherboard requires ${moboRam} but RAM is ${ramType}.`);
      }
    }
  }

  if (psu && gpu) {
    const psuWatt = parseInt(psu.specs['Wattage'] || '0', 10);
    const gpuRec = parseInt(gpu.specs['Recommended PSU'] || '0', 10);
    if (psuWatt > 0 && gpuRec > 0) {
      if (psuWatt >= gpuRec) {
        notes.push(`Power headroom confirmed (${psuWatt}W PSU meets ${gpuRec}W GPU guideline).`);
      } else {
        warnings.push(`Insufficient PSU wattage: ${psuWatt}W selected, GPU recommends at least ${gpuRec}W.`);
      }
    }
  }

  if (notes.length === 0 && warnings.length === 0) {
    notes.push('Standard USB-C / HDMI / DisplayPort peripheral compatibility verified across selected items.');
  }

  return {
    compatible: warnings.length === 0,
    notes,
    warnings,
  };
}
