export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';
export type LanguageCode = 'en' | 'hi';

export type CategoryId =
  | 'electronics'
  | 'smartphones'
  | 'laptops'
  | 'gaming'
  | 'fashion'
  | 'home'
  | 'furniture'
  | 'education'
  | 'books'
  | 'sports'
  | 'beauty'
  | 'automotive'
  | 'gifts';

export type RecommendationBadge =
  | 'Best overall'
  | 'Best value for money'
  | 'Best budget option'
  | 'Best premium option'
  | 'Best for your requirements'
  | 'Best long-term purchase';

export interface ScoreWeights {
  performance: number;
  value: number;
  requirementsMatch: number;
  reliability: number;
  reviewQuality: number;
  warrantySupport: number;
}

export interface ScoreDimension {
  key: keyof ScoreWeights;
  label: string;
  weight: number;
  score: number | null;
  evidence: string;
  missing?: boolean;
}

export interface BuySmartScoreBreakdown {
  total: number;
  confidence: 'High' | 'Medium' | 'Low';
  missingEvidence: string[];
  dimensions: ScoreDimension[];
  recommendationCategory?: RecommendationBadge;
}

export interface MerchantOffer {
  merchant: string;
  domain: string;
  price: number;
  originalPrice?: number;
  discountPct?: number;
  shippingCost: number;
  estimatedTax: number;
  totalCost: number;
  currency: CurrencyCode;
  inStock: boolean;
  sellerName: string;
  warranty: string;
  deliveryEstimate: string;
  url: string;
  retrievedAt: string;
  verifiedSource: boolean;
}

export interface PricePoint {
  date: string;
  price: number;
  merchant: string;
}

export interface PriceStats {
  current: number;
  lowest: number;
  highest: number;
  average: number;
  guidance: 'competitive' | 'above_average' | 'wait_recommended' | 'insufficient_history';
  guidanceText: string;
  discountPattern: string;
}

export interface ReviewSummary {
  sampleSize: number;
  sampleDate: string;
  averageRating: number | null;
  pros: string[];
  cons: string[];
  durabilityFeedback: string;
  serviceComplaints: string[];
  commonMisunderstandings: string[];
  positiveVsNegativeDiff: string;
  authenticityEstimate: {
    label: 'High Organic Signal' | 'Mixed Signal' | 'Elevated Anomaly Signal' | 'Insufficient Sample';
    confidenceNote: string;
  };
}

export interface SafetyIndicator {
  type: string;
  severity: 'info' | 'warning' | 'caution';
  explanation: string;
}

export interface SafetyAssessment {
  riskLevel: 'Low' | 'Moderate' | 'Elevated';
  indicators: SafetyIndicator[];
  disclaimer: string;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  category: CategoryId;
  variant: string;
  imageUrl: string;
  summary: string;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
  aiExplanation: string;
  rating: number | null;
  reviewCount: number | null;
  offers: MerchantOffer[];
  score: BuySmartScoreBreakdown;
  priceHistory: PricePoint[];
  priceStats: PriceStats;
  reviewSummary: ReviewSummary;
  safety: SafetyAssessment;
  isLiveGrounded?: boolean;
  groundingSources?: Array<{ title: string; uri: string }>;
  sponsored?: boolean;
  retrievedAt: string;
}

export interface SearchIntent {
  rawQuery: string;
  budget?: number;
  currency: CurrencyCode;
  category?: CategoryId;
  purpose?: string;
  brandPreferences?: string[];
  requiredFeatures?: string[];
  country: string;
  clarifyingQuestions?: string[];
}

export interface SearchResponse {
  intent: SearchIntent;
  products: Product[];
  sourceMode: 'live_grounded' | 'verified_catalog' | 'hybrid';
  notice?: string;
  retrievedAt: string;
}

export interface ComparisonAnalysis {
  products: Product[];
  priorities: ScoreWeights;
  winnerId: string;
  conclusion: string;
  fitMatrix: Array<{ persona: string; productId: string; reason: string }>;
  meaningfulDifferences: string[];
}

export interface CartOptimizationItem {
  slot: string;
  category: string;
  allocatedBudget: number;
  product: Product;
  quantity: number;
  estimatedTotal: number;
  alternatives: Product[];
}

export interface CartOptimizationResult {
  goal: string;
  totalBudget: number;
  currency: CurrencyCode;
  items: CartOptimizationItem[];
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  compatibilityNotes: string[];
  warnings: string[];
  unnecessarySavingsTip?: string;
}

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  nameHi: string;
  description: string;
  productCount: number;
  sampleBudgetINR: number;
}
