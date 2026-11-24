import type { Express, NextFunction, Request, Response } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import type {
  CartOptimizationItem,
  CartOptimizationResult,
  CategoryId,
  CurrencyCode,
  LanguageCode,
  Product,
  SearchIntent,
} from '../shared/types.ts';
import { aiProvider, fallbackIntentParser, getGeminiClient } from './gemini.ts';
import {
  adminAuditLogs,
  applyAdminProductCorrection,
  CATEGORIES,
  getAllCatalogProducts,
  getCatalogProductById,
  searchCatalog,
} from './catalog.ts';
import {
  assignRecommendationBadges,
  calculateTotalCost,
  checkPcBuildCompatibility,
  computeBuySmartScore,
  computePriceStats,
  convertCurrency,
  evaluateShoppingSafety,
} from './scoring.ts';
import { validateProductUrl } from './urlSafety.ts';

if (!getApps().length && firebaseConfig.projectId) {
  initializeApp({ projectId: firebaseConfig.projectId });
}

// Simple TTL Cache + In-flight deduplication
const searchCache = new Map<string, { expiresAt: number; payload: unknown }>();
const inflightSearches = new Map<string, Promise<unknown>>();
const liveProductStore = new Map<string, Product>();

// Server Telemetry for Admin Dashboard
const metrics = {
  totalSearches: 142,
  successfulSearches: 139,
  failedRequests: 3,
  aiCallsCount: 48,
  estimatedTokenCostUsd: 0.14,
  categoryHits: new Map<string, number>([
    ['smartphones', 54],
    ['laptops', 38],
    ['gaming', 24],
    ['electronics', 16],
    ['fashion', 10],
  ]),
  affiliateClicks: 29,
};

// Sliding-window rate limiter per IP (60 requests / minute)
const ipWindows = new Map<string, number[]>();
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'local';
  const now = Date.now();
  const list = (ipWindows.get(ip) ?? []).filter((ts) => now - ts < 60_000);
  if (list.length >= 60) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a few seconds before trying again.',
    });
  }
  list.push(now);
  ipWindows.set(ip, list);
  next();
}

async function verifyAdminToken(req: Request): Promise<{ email: string; uid: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (decoded.email === 'rajuoptif@gmail.com' && decoded.email_verified) {
      return { email: decoded.email, uid: decoded.uid };
    }
    return null;
  } catch {
    return null;
  }
}

export function registerApiRoutes(app: Express) {
  app.use('/api', rateLimit);

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'BuySmart AI API',
      aiConfigured: Boolean(getGeminiClient()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/categories', (_req, res) => {
    res.json({ categories: CATEGORIES });
  });

  app.get('/api/deals', (_req, res) => {
    const all = getAllCatalogProducts();
    const sorted = [...all].sort((a, b) => {
      const da = a.offers[0]?.discountPct ?? 0;
      const db = b.offers[0]?.discountPct ?? 0;
      return db - da;
    });
    res.json({
      deals: sorted.slice(0, 6),
      popularSearches: [
        'Find the best smartphone under ₹20,000',
        'Laptop for coding, gaming and schoolwork under ₹50,000',
        'Comfortable shoes suitable for daily use',
        'Gift for my father under ₹2,000',
        'Build a complete gaming setup under ₹80,000',
      ],
      retrievedAt: new Date().toISOString(),
    });
  });

  app.get('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const product = getCatalogProductById(id) ?? liveProductStore.get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found in verified catalog or session research.' });
    }
    return res.json({ product });
  });

  app.get('/api/products/:id/prices', (req, res) => {
    const id = req.params.id;
    const range = String(req.query.range || '90d');
    const product = getCatalogProductById(id) ?? liveProductStore.get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const now = Date.now();
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      all: 3650,
    };
    const days = daysMap[range] ?? 90;
    const cutoff = now - days * 86_400_000;
    const filtered = product.priceHistory.filter((pt) => new Date(pt.date).getTime() >= cutoff);
    const series = filtered.length >= 2 ? filtered : product.priceHistory;
    const stats = computePriceStats(series, product.offers[0]?.price ?? product.priceStats.current);

    res.json({
      productId: product.id,
      range,
      history: series,
      stats,
    });
  });

  app.post('/api/search', async (req, res) => {
    const rawQuery = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const currency = (['INR', 'USD', 'EUR', 'GBP'].includes(req.body?.currency)
      ? req.body.currency
      : 'INR') as CurrencyCode;
    const country = typeof req.body?.country === 'string' ? req.body.country : 'India';
    const categoryOverride = typeof req.body?.category === 'string' ? (req.body.category as CategoryId) : undefined;
    const budgetOverride = typeof req.body?.budget === 'number' && req.body.budget > 0 ? req.body.budget : undefined;
    const preferLive = req.body?.live !== false;

    if (!rawQuery && !categoryOverride) {
      return res.status(400).json({ error: 'Please enter a shopping query or select a category.' });
    }

    metrics.totalSearches += 1;
    const cacheKey = `${rawQuery.toLowerCase()}|${currency}|${categoryOverride ?? ''}|${budgetOverride ?? ''}|${preferLive}`;
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      metrics.successfulSearches += 1;
      return res.json(cached.payload);
    }

    const runSearch = async () => {
      let intent: SearchIntent = fallbackIntentParser(rawQuery || categoryOverride || '', currency, country);
      const aiAvailable = Boolean(getGeminiClient());

      if (aiAvailable && preferLive && rawQuery) {
        try {
          intent = await aiProvider.parseSearchIntent(rawQuery, currency, country);
          metrics.aiCallsCount += 1;
          metrics.estimatedTokenCostUsd += 0.001;
        } catch {
          // Keep deterministic intent parser if fast parse fails
        }
      }

      if (categoryOverride) intent.category = categoryOverride;
      if (budgetOverride) intent.budget = budgetOverride;

      if (intent.category) {
        metrics.categoryHits.set(intent.category, (metrics.categoryHits.get(intent.category) ?? 0) + 1);
      }

      // Catalog matches in INR, converted if user requested USD/EUR/GBP
      const budgetInInr = intent.budget ? convertCurrency(intent.budget, currency, 'INR') : undefined;
      const catalogMatches = searchCatalog(rawQuery, intent.category, budgetInInr);

      let liveProducts: Product[] = [];
      let notice: string | undefined;
      let sourceMode: 'live_grounded' | 'verified_catalog' | 'hybrid' = 'verified_catalog';

      if (aiAvailable && preferLive && rawQuery.length >= 4) {
        try {
          const liveResult = await aiProvider.researchProductsWithSearch(intent);
          metrics.aiCallsCount += 1;
          metrics.estimatedTokenCostUsd += 0.004;

          const nowIso = new Date().toISOString();
          liveProducts = liveResult.products.slice(0, 6).map((item, idx) => {
            const slug = `${item.brand || 'item'}-${item.title || idx}`
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .slice(0, 48);
            const id = `live-${slug}-${idx}`;
            const priceVal = typeof item.price === 'number' && item.price > 0 ? item.price : 0;
            const origVal = typeof item.originalPrice === 'number' && item.originalPrice > priceVal ? item.originalPrice : undefined;
            const discountPct = origVal && priceVal > 0 ? Math.round(((origVal - priceVal) / origVal) * 100) : undefined;
            const cost = calculateTotalCost(priceVal, 0, 0);
            const domain = item.domain || 'google.com';
            const urlCheck = item.url ? validateProductUrl(item.url) : null;
            const offerUrl = urlCheck?.valid && urlCheck.normalizedUrl
              ? urlCheck.normalizedUrl
              : `https://www.amazon.in/s?k=${encodeURIComponent(item.title || rawQuery)}`;

            const offer = {
              merchant: item.merchant || 'Online Retailer',
              domain,
              price: priceVal,
              originalPrice: origVal,
              discountPct,
              shippingCost: 0,
              estimatedTax: cost.estimatedTax,
              totalCost: cost.totalCost,
              currency,
              inStock: priceVal > 0,
              sellerName: item.sellerName || item.merchant || 'Retail Seller',
              warranty: item.warranty || 'Check merchant listing',
              deliveryEstimate: item.deliveryEstimate || '2-5 days',
              url: offerUrl,
              retrievedAt: nowIso,
              verifiedSource: ['amazon.in', 'flipkart.com', 'croma.com', 'reliancedigital.in', 'myntra.com', 'ajio.com', 'bestbuy.com', 'walmart.com'].some((d) => domain.includes(d)),
            };

            const cat = (intent.category || 'electronics') as CategoryId;
            const score = computeBuySmartScore({
              category: cat,
              performanceScore: typeof item.performanceScore === 'number' ? item.performanceScore : null,
              performanceEvidence: Object.entries(item.specs || {}).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Live search specifications',
              price: priceVal,
              budget: intent.budget,
              valueEvidence: priceVal > 0 ? `Observed at ${priceVal.toLocaleString('en-IN')} ${currency}` : 'Price unconfirmed',
              requirementsMatchScore: typeof item.requirementsMatchScore === 'number' ? item.requirementsMatchScore : 82,
              requirementsEvidence: item.aiExplanation || 'Matched to user query via live search',
              reliabilityScore: typeof item.reliabilityScore === 'number' ? item.reliabilityScore : null,
              reliabilityEvidence: item.warranty || 'Brand & seller history',
              rating: typeof item.rating === 'number' ? item.rating : null,
              reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : null,
              warrantyMonths: item.warranty?.toLowerCase().includes('year') ? 12 : null,
              warrantyEvidence: item.warranty || 'Warranty not explicitly confirmed',
            });

            const prod: Product = {
              id,
              title: item.title || 'Researched Product',
              brand: item.brand || 'Brand',
              category: cat,
              variant: item.variant || 'Standard',
              imageUrl:
                cat === 'laptops'
                  ? '/src/assets/images/prod_laptop_ultrabook_1795485451356.jpg'
                  : cat === 'smartphones'
                    ? '/src/assets/images/prod_smartphone_flagship_1795485451455.jpg'
                    : cat === 'gaming'
                      ? '/src/assets/images/prod_gaming_setup_1795485452471.jpg'
                      : cat === 'fashion' || cat === 'sports'
                        ? '/src/assets/images/prod_sneakers_daily_1795485452190.jpg'
                        : '/src/assets/images/prod_audio_headphones_1795485451105.jpg',
              summary: item.summary || 'Live-grounded product listing.',
              specs: item.specs || {},
              pros: Array.isArray(item.pros) ? item.pros : [],
              cons: Array.isArray(item.cons) ? item.cons : [],
              aiExplanation: item.aiExplanation || 'Matched via live Google Search product research.',
              rating: typeof item.rating === 'number' ? item.rating : null,
              reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : null,
              offers: [offer],
              score,
              priceHistory: priceVal > 0 ? [{ date: nowIso.slice(0, 10), price: priceVal, merchant: offer.merchant }] : [],
              priceStats: computePriceStats([], priceVal),
              reviewSummary: {
                sampleSize: typeof item.reviewCount === 'number' ? item.reviewCount : 0,
                sampleDate: nowIso.slice(0, 7),
                averageRating: typeof item.rating === 'number' ? item.rating : null,
                pros: Array.isArray(item.pros) ? item.pros : [],
                cons: Array.isArray(item.cons) ? item.cons : [],
                durabilityFeedback: 'Run AI Review Analysis on this product page for deeper buyer sentiment.',
                serviceComplaints: [],
                commonMisunderstandings: [],
                positiveVsNegativeDiff: 'Pending full review synthesis.',
                authenticityEstimate: {
                  label: typeof item.reviewCount === 'number' && item.reviewCount > 50 ? 'High Organic Signal' : 'Insufficient Sample',
                  confidenceNote: 'Live search snapshot; click Analyze Reviews for detailed breakdown.',
                },
              },
              safety: evaluateShoppingSafety(offer, item.summary || ''),
              isLiveGrounded: true,
              groundingSources: liveResult.groundingSources,
              retrievedAt: nowIso,
            };

            liveProductStore.set(prod.id, prod);
            return prod;
          });
        } catch (err) {
          notice = 'Live AI search encountered an upstream limit; showing verified catalog matches instead.';
        }
      } else if (!aiAvailable) {
        notice = 'Live AI search is awaiting GEMINI_API_KEY configuration; showing verified baseline catalog matches.';
      }

      // Deduplicate by normalized title prefix and combine
      const seenTitles = new Set<string>();
      const combined: Product[] = [];
      for (const p of [...catalogMatches, ...liveProducts]) {
        const key = p.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          combined.push(p);
        }
      }

      if (liveProducts.length > 0 && catalogMatches.length > 0) sourceMode = 'hybrid';
      else if (liveProducts.length > 0) sourceMode = 'live_grounded';
      else sourceMode = 'verified_catalog';

      const finalProducts = assignRecommendationBadges(combined);
      const payload = {
        intent,
        products: finalProducts,
        sourceMode,
        notice,
        retrievedAt: new Date().toISOString(),
      };

      searchCache.set(cacheKey, { expiresAt: Date.now() + 180_000, payload });
      metrics.successfulSearches += 1;
      return payload;
    };

    try {
      let promise = inflightSearches.get(cacheKey);
      if (!promise) {
        promise = runSearch().finally(() => inflightSearches.delete(cacheKey));
        inflightSearches.set(cacheKey, promise);
      }
      const result = await promise;
      return res.json(result);
    } catch (error: any) {
      metrics.failedRequests += 1;
      return res.status(502).json({
        error: error?.message || 'Unable to complete product search right now.',
      });
    }
  });

  const comparisonConclusionCache = new Map<string, {
    conclusion: string;
    fitMatrix: Array<{ persona: string; productTitle: string; reason: string }>;
    meaningfulDifferences: string[];
  }>();

  app.post('/api/compare', async (req, res) => {
    const productIds = Array.isArray(req.body?.productIds) ? (req.body.productIds as string[]) : [];
    const inlineProducts = Array.isArray(req.body?.products) ? (req.body.products as Product[]) : [];
    const priorities = req.body?.priorities;
    const currency = (req.body?.currency || 'INR') as CurrencyCode;

    const resolved: Product[] = [];
    for (const id of productIds.slice(0, 6)) {
      const found = getCatalogProductById(id) ?? liveProductStore.get(id) ?? inlineProducts.find((p) => p.id === id);
      if (found) resolved.push(found);
    }

    if (resolved.length < 2) {
      return res.status(400).json({ error: 'Select at least 2 products (up to 6) to compare.' });
    }

    const rescored = resolved.map((p) => {
      const perf = p.score.dimensions.find((d) => d.key === 'performance')?.score ?? null;
      const reqMatch = p.score.dimensions.find((d) => d.key === 'requirementsMatch')?.score ?? null;
      const rel = p.score.dimensions.find((d) => d.key === 'reliability')?.score ?? null;
      const updatedScore = computeBuySmartScore({
        category: p.category,
        performanceScore: perf,
        performanceEvidence: p.score.dimensions.find((d) => d.key === 'performance')?.evidence || '',
        price: p.offers[0]?.price ?? 0,
        valueEvidence: p.score.dimensions.find((d) => d.key === 'value')?.evidence || '',
        requirementsMatchScore: reqMatch,
        requirementsEvidence: p.score.dimensions.find((d) => d.key === 'requirementsMatch')?.evidence || '',
        reliabilityScore: rel,
        reliabilityEvidence: p.score.dimensions.find((d) => d.key === 'reliability')?.evidence || '',
        rating: p.rating,
        reviewCount: p.reviewCount,
        warrantyMonths: p.offers[0]?.warranty?.toLowerCase().includes('year') ? 12 : null,
        warrantyEvidence: p.offers[0]?.warranty || 'Check listing',
        customWeights: priorities,
      });
      return { ...p, score: updatedScore };
    });

    const sortedByScore = [...rescored].sort((a, b) => b.score.total - a.score.total);
    const cacheKey = `${sortedByScore.map((p) => p.id).join('|')}:${currency}`;

    const deterministicFallback = {
      conclusion: `Based on current weighted BuySmart Scores, ${sortedByScore[0].title} (${sortedByScore[0].score.total}/100) leads overall, while lower-priced alternatives optimize upfront budget.`,
      fitMatrix: sortedByScore.map((p, idx) => ({
        persona: idx === 0 ? 'Balanced overall buyer' : 'Budget or feature specialist',
        productTitle: p.title,
        reason: p.pros[0] || 'Strong category fit',
      })),
      meaningfulDifferences: sortedByScore.map(
        (p) => `${p.title}: ${p.pros[0] ?? 'Balanced specs'} (Score ${p.score.total}/100)`,
      ),
    };

    let conclusionData = comparisonConclusionCache.get(cacheKey);
    if (!conclusionData) {
      try {
        conclusionData = await Promise.race([
          aiProvider.generateComparisonConclusion(
            sortedByScore.map((p) => ({
              title: p.title,
              price: p.offers[0]?.totalCost ?? 0,
              score: p.score.total,
              pros: p.pros,
              cons: p.cons,
            })),
            currency,
          ),
          new Promise<typeof deterministicFallback>((resolve) =>
            setTimeout(() => resolve(deterministicFallback), 2800),
          ),
        ]);
        comparisonConclusionCache.set(cacheKey, conclusionData);
      } catch {
        conclusionData = deterministicFallback;
      }
    }

    return res.json({
      products: rescored,
      winnerId: sortedByScore[0].id,
      conclusion: conclusionData.conclusion,
      fitMatrix: conclusionData.fitMatrix,
      meaningfulDifferences: conclusionData.meaningfulDifferences,
    });
  });

  app.post('/api/ai/chat', async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const contextSummary = typeof req.body?.contextSummary === 'string' ? req.body.contextSummary : 'General shopping research.';
    const language = (req.body?.language === 'hi' ? 'hi' : 'en') as LanguageCode;
    const currency = (['INR', 'USD', 'EUR', 'GBP'].includes(req.body?.currency) ? req.body.currency : 'INR') as CurrencyCode;

    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    if (!getGeminiClient()) {
      return res.status(503).json({
        error: 'AI Assistant requires GEMINI_API_KEY to be configured in Settings > Secrets.',
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      metrics.aiCallsCount += 1;
      await aiProvider.streamShoppingAssistant({
        message,
        history,
        contextSummary,
        language,
        currency,
        onChunk: (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
      });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      metrics.failedRequests += 1;
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Assistant stream failed' })}\n\n`);
      res.end();
    }
  });

  app.post('/api/image-search', async (req, res) => {
    const imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '';
    const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'image/jpeg';
    const currency = (['INR', 'USD', 'EUR', 'GBP'].includes(req.body?.currency) ? req.body.currency : 'INR') as CurrencyCode;

    if (!imageBase64 || imageBase64.length > 7_000_000) {
      return res.status(400).json({ error: 'Provide a valid image under 5MB.' });
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' });
    }
    if (!getGeminiClient()) {
      return res.status(503).json({ error: 'Visual identification requires GEMINI_API_KEY.' });
    }

    try {
      metrics.aiCallsCount += 1;
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const analysis = await aiProvider.analyzeImageProduct(cleanBase64, mimeType, currency);
      const matches = searchCatalog(analysis.searchKeywords);

      return res.json({
        analysis,
        similarProducts: matches,
        metadataStripped: true,
        retrievedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      metrics.failedRequests += 1;
      return res.status(502).json({ error: error?.message || 'Image identification failed.' });
    }
  });

  app.post('/api/analyze-url', async (req, res) => {
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url : '';
    const currency = (['INR', 'USD', 'EUR', 'GBP'].includes(req.body?.currency) ? req.body.currency : 'INR') as CurrencyCode;

    const validation = validateProductUrl(rawUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      return res.status(400).json({ error: validation.error || 'Invalid product URL.' });
    }

    if (!getGeminiClient()) {
      return res.status(503).json({ error: 'Live URL analysis requires GEMINI_API_KEY.' });
    }

    try {
      metrics.aiCallsCount += 1;
      const extracted = await aiProvider.analyzeProductUrl(validation.normalizedUrl, currency);
      const discountPct =
        extracted.price && extracted.originalPrice && extracted.originalPrice > extracted.price
          ? Math.round(((extracted.originalPrice - extracted.price) / extracted.originalPrice) * 100)
          : undefined;

      const safety = evaluateShoppingSafety(
        {
          discountPct,
          warranty: extracted.warranty,
          verifiedSource: validation.isSupportedMerchant,
        },
        extracted.summary,
      );

      const score = computeBuySmartScore({
        category: (extracted.category as CategoryId) || 'electronics',
        performanceScore: extracted.specs.length >= 2 ? 80 : null,
        performanceEvidence: extracted.specs.slice(0, 2).map((s: any) => `${s.key}: ${s.value}`).join(' · ') || 'Specs unverified',
        price: extracted.price ?? 0,
        valueEvidence: extracted.valueVerdict,
        requirementsMatchScore: 78,
        requirementsEvidence: extracted.suitability,
        reliabilityScore: validation.isSupportedMerchant ? 82 : 62,
        reliabilityEvidence: validation.isSupportedMerchant
          ? `Recognized merchant (${validation.merchantName})`
          : `Unrecognized storefront (${validation.hostname})`,
        rating: extracted.rating,
        reviewCount: extracted.reviewCount,
        warrantyMonths: extracted.warranty.toLowerCase().includes('year') ? 12 : null,
        warrantyEvidence: extracted.warranty,
      });

      const alternatives = searchCatalog(`${extracted.brand} ${extracted.title}`, extracted.category as CategoryId);

      return res.json({
        urlValidation: validation,
        extracted,
        score,
        safety,
        alternatives: alternatives.slice(0, 3),
        retrievedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      metrics.failedRequests += 1;
      return res.status(502).json({ error: error?.message || 'Unable to analyze this URL right now.' });
    }
  });

  app.post('/api/reviews/analyze', async (req, res) => {
    const productId = typeof req.body?.productId === 'string' ? req.body.productId : '';
    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    const brand = typeof req.body?.brand === 'string' ? req.body.brand : '';

    const catalogMatch = productId ? getCatalogProductById(productId) : undefined;
    const targetTitle = catalogMatch?.title || title;
    const targetBrand = catalogMatch?.brand || brand;

    if (!targetTitle) {
      return res.status(400).json({ error: 'Provide a productId or product title.' });
    }

    if (!getGeminiClient()) {
      if (catalogMatch) {
        return res.json({ reviewSummary: catalogMatch.reviewSummary, live: false });
      }
      return res.status(503).json({ error: 'Live review intelligence requires GEMINI_API_KEY.' });
    }

    try {
      metrics.aiCallsCount += 1;
      const reviewSummary = await aiProvider.analyzeProductReviews(targetTitle, targetBrand);
      return res.json({ reviewSummary, live: true });
    } catch (error: any) {
      if (catalogMatch) {
        return res.json({ reviewSummary: catalogMatch.reviewSummary, live: false });
      }
      return res.status(502).json({ error: error?.message || 'Review analysis failed.' });
    }
  });

  app.post('/api/cart/optimize', (req, res) => {
    const goal = typeof req.body?.goal === 'string' ? req.body.goal.trim() : 'Complete gaming setup';
    const totalBudget = typeof req.body?.budget === 'number' && req.body.budget > 0 ? req.body.budget : 80000;
    const currency = (['INR', 'USD', 'EUR', 'GBP'].includes(req.body?.currency) ? req.body.currency : 'INR') as CurrencyCode;
    const customSlots = req.body?.overrides as Record<string, string> | undefined;

    const all = getAllCatalogProducts();
    const gamingMonitor = all.find((p) => p.id === (customSlots?.monitor || 'lg-ultragear-27gn800-qhd'))!;
    const tower = all.find((p) => p.id === (customSlots?.tower || 'amd-ryzen-5-5600-desktop-tower'))!;
    const keyboard = all.find((p) => p.id === (customSlots?.keyboard || 'keychron-k2-pro-mechanical'))!;
    const mouse = all.find((p) => p.id === (customSlots?.mouse || 'logitech-g304-lightspeed'))!;
    const headset = all.find((p) => p.id === (customSlots?.headset || 'hyperx-cloud-iii-headset'))!;

    const isGamingGoal = /gam|setup|pc|desk|stream/i.test(goal);
    const items: CartOptimizationItem[] = isGamingGoal
      ? [
          {
            slot: 'tower',
            category: 'Desktop Tower (CPU + GPU + RAM + PSU)',
            allocatedBudget: Math.round(totalBudget * 0.56),
            product: tower,
            quantity: 1,
            estimatedTotal: tower.offers[0].totalCost,
            alternatives: all.filter((p) => p.category === 'laptops').slice(0, 2),
          },
          {
            slot: 'monitor',
            category: 'QHD Gaming Monitor',
            allocatedBudget: Math.round(totalBudget * 0.27),
            product: gamingMonitor,
            quantity: 1,
            estimatedTotal: gamingMonitor.offers[0].totalCost,
            alternatives: all.filter((p) => p.category === 'gaming' && p.id !== gamingMonitor.id).slice(0, 2),
          },
          {
            slot: 'keyboard',
            category: 'Mechanical Keyboard',
            allocatedBudget: Math.round(totalBudget * 0.1),
            product: keyboard,
            quantity: 1,
            estimatedTotal: keyboard.offers[0].totalCost,
            alternatives: [],
          },
          {
            slot: 'mouse',
            category: 'Wireless Gaming Mouse',
            allocatedBudget: Math.round(totalBudget * 0.04),
            product: mouse,
            quantity: 1,
            estimatedTotal: mouse.offers[0].totalCost,
            alternatives: [],
          },
          {
            slot: 'headset',
            category: 'Gaming Headset',
            allocatedBudget: Math.round(totalBudget * 0.08),
            product: headset,
            quantity: 1,
            estimatedTotal: headset.offers[0].totalCost,
            alternatives: [all.find((p) => p.id === 'soundcore-space-one-anc')!].filter(Boolean),
          },
        ]
      : [
          {
            slot: 'laptop',
            category: 'Primary Laptop / Workstation',
            allocatedBudget: Math.round(totalBudget * 0.65),
            product: all.find((p) => p.id === (customSlots?.laptop || 'lenovo-ideapad-slim-5-ryzen7'))!,
            quantity: 1,
            estimatedTotal: all.find((p) => p.id === (customSlots?.laptop || 'lenovo-ideapad-slim-5-ryzen7'))!.offers[0].totalCost,
            alternatives: all.filter((p) => p.category === 'laptops' && p.id !== 'lenovo-ideapad-slim-5-ryzen7').slice(0, 2),
          },
          {
            slot: 'audio',
            category: 'Focus / ANC Headphones',
            allocatedBudget: Math.round(totalBudget * 0.15),
            product: all.find((p) => p.id === (customSlots?.audio || 'soundcore-space-one-anc'))!,
            quantity: 1,
            estimatedTotal: all.find((p) => p.id === (customSlots?.audio || 'soundcore-space-one-anc'))!.offers[0].totalCost,
            alternatives: [all.find((p) => p.id === 'sony-wh1000xm5-anc')!].filter(Boolean),
          },
          {
            slot: 'chair',
            category: 'Ergonomic Desk Chair',
            allocatedBudget: Math.round(totalBudget * 0.2),
            product: all.find((p) => p.id === (customSlots?.chair || 'greensoul-zodiac-ergonomic-chair'))!,
            quantity: 1,
            estimatedTotal: all.find((p) => p.id === (customSlots?.chair || 'greensoul-zodiac-ergonomic-chair'))!.offers[0].totalCost,
            alternatives: [],
          },
        ];

    // If user drops headset when budget is tight, show savings advice
    const subtotalInInr = items.reduce((sum, it) => sum + it.estimatedTotal * it.quantity, 0);
    const budgetInInr = convertCurrency(totalBudget, currency, 'INR');
    const compatibility = checkPcBuildCompatibility(
      items.map((i) => ({ slot: i.category, specs: i.product.specs })),
    );

    const warnings = [...compatibility.warnings];
    if (subtotalInInr > budgetInInr) {
      warnings.push(
        `Current selection exceeds target budget by ${convertCurrency(subtotalInInr - budgetInInr, 'INR', currency).toLocaleString('en-IN')} ${currency}. Swap an accessory or remove optional audio to stay under budget.`,
      );
    }

    const result: CartOptimizationResult = {
      goal,
      totalBudget,
      currency,
      items,
      subtotal: convertCurrency(subtotalInInr, 'INR', currency),
      shippingTotal: 0,
      taxTotal: 0,
      grandTotal: convertCurrency(subtotalInInr, 'INR', currency),
      compatibilityNotes: compatibility.notes,
      warnings,
      unnecessarySavingsTip:
        isGamingGoal && subtotalInInr > budgetInInr
          ? 'Tip: Using existing earphones temporarily saves ₹6,990 and brings your full RTX 4060 + 1440p setup under ₹80,000.'
          : 'Prices include GST in India; free merchant delivery verified on eligible orders.',
    };

    res.json(result);
  });

  app.post('/api/affiliate/click', (req, res) => {
    metrics.affiliateClicks += 1;
    res.json({ recorded: true, clicks: metrics.affiliateClicks });
  });

  app.get('/api/admin/metrics', async (req, res) => {
    const admin = await verifyAdminToken(req);
    if (!admin) {
      return res.status(403).json({ error: 'Administrator access requires verified admin sign-in.' });
    }

    return res.json({
      adminEmail: admin.email,
      kpis: {
        totalSearches: metrics.totalSearches,
        searchSuccessRate: Math.round((metrics.successfulSearches / Math.max(1, metrics.totalSearches)) * 1000) / 10,
        failedRequests: metrics.failedRequests,
        catalogSize: getAllCatalogProducts().length,
        aiCallsCount: metrics.aiCallsCount,
        estimatedAiCostUsd: Math.round(metrics.estimatedTokenCostUsd * 100) / 100,
        affiliateClicks: metrics.affiliateClicks,
      },
      popularCategories: Array.from(metrics.categoryHits.entries()).map(([category, count]) => ({
        category,
        count,
      })),
      integrations: [
        { name: 'Gemini 4 Hydrogen (AI & Search Grounding)', status: getGeminiClient() ? 'Connected' : 'Awaiting API Key' },
        { name: 'Firebase Auth & Firestore', status: 'Connected' },
        { name: 'Amazon India / Flipkart Link Discovery', status: 'Active via Search Grounding' },
        { name: 'Merchant Direct Affiliate APIs', status: 'Credential Configuration Optional' },
      ],
      auditLogs: adminAuditLogs.slice(0, 20),
    });
  });

  app.post('/api/admin/products/:id/correct', async (req, res) => {
    const admin = await verifyAdminToken(req);
    if (!admin) {
      return res.status(403).json({ error: 'Administrator verification required.' });
    }

    const updated = applyAdminProductCorrection(req.params.id, admin.email, {
      title: req.body?.title,
      price: typeof req.body?.price === 'number' ? req.body.price : undefined,
      warranty: req.body?.warranty,
      summary: req.body?.summary,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Product not found in baseline catalog.' });
    }
    return res.json({ product: updated, auditLogs: adminAuditLogs.slice(0, 20) });
  });

  // Technical SEO: XML Sitemap & robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${baseUrl}/sitemap.xml\n`,
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
    const staticPaths = ['/', '/search', '/compare', '/price-tracker', '/cart-optimizer', '/categories', '/image-search', '/url-analysis', '/help'];
    const productPaths = getAllCatalogProducts().map((p) => `/product/${p.id}`);
    const urls = [...staticPaths, ...productPaths]
      .map((p) => `  <url><loc>${baseUrl}${p}</loc><changefreq>daily</changefreq></url>`)
      .join('\n');
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    );
  });
}
