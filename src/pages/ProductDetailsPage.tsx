import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Bookmark,
  Flag,
  GitCompare,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { formatCurrency, safeExternalUrl } from '../lib/i18n';
import { PriceAlertModal } from '../components/PriceAlertModal';
import type { PricePoint, PriceStats, Product, ReviewSummary } from '../shared/types';

interface ProductDetailsPageProps {
  productId: string;
}

export const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({ productId }) => {
  const {
    navigate,
    currency,
    compareIds,
    toggleCompare,
    toggleSaveProduct,
    isProductSaved,
    compareProductsCache,
    user,
    theme,
    showToast,
  } = useApp();

  const [product, setProduct] = useState<Product | null>(
    compareProductsCache[productId] || null,
  );
  const [loading, setLoading] = useState(!compareProductsCache[productId]);
  const [error, setError] = useState<string | null>(null);

  const [priceRange, setPriceRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('90d');
  const [priceSeries, setPriceSeries] = useState<PricePoint[]>([]);
  const [priceStats, setPriceStats] = useState<PriceStats | null>(null);

  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [analyzingReviews, setAnalyzingReviews] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [reportIssueType, setReportIssueType] = useState<'wrong_price' | 'wrong_spec' | 'broken_link' | 'safety_concern' | 'other'>('wrong_price');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(productId)}`)
      .then(async (r) => {
        if (!r.ok) {
          if (compareProductsCache[productId]) return { product: compareProductsCache[productId] };
          throw new Error('Product not found');
        }
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        setProduct(data.product);
        setPriceSeries(data.product.priceHistory || []);
        setPriceStats(data.product.priceStats || null);
        setReviewSummary(data.product.reviewSummary || null);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Unable to load product');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, compareProductsCache]);

  useEffect(() => {
    if (!product) return;
    fetch(`/api/products/${encodeURIComponent(product.id)}/prices?range=${priceRange}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.history) setPriceSeries(data.history);
        if (data?.stats) setPriceStats(data.stats);
      })
      .catch(() => {});
  }, [priceRange, product]);

  const handleAnalyzeReviews = async () => {
    if (!product) return;
    setAnalyzingReviews(true);
    try {
      const resp = await fetch('/api/reviews/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          title: product.title,
          brand: product.brand,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Review analysis failed');
      setReviewSummary(data.reviewSummary);
      showToast(data.live ? 'Live review intelligence updated' : 'Loaded verified review summary');
    } catch (err: any) {
      showToast(err?.message || 'Unable to analyze reviews');
    } finally {
      setAnalyzingReviews(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || reportDetails.trim().length < 5) {
      showToast('Please enter at least 5 characters describing the issue.');
      return;
    }
    if (!user) {
      showToast('Sign in to submit product accuracy reports.');
      return;
    }
    setReportSubmitting(true);
    const docId = `rep_${user.uid}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'product_reports', docId), {
        userId: user.uid,
        productId: product.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120),
        issueType: reportIssueType,
        details: reportDetails.trim().slice(0, 1000),
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setReportDetails('');
      showToast('Report submitted for admin verification');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `product_reports/${docId}`);
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="h-96 rounded-2xl bg-white dark:bg-[#171A20] animate-pulse" />
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#101216] dark:text-white">
          Product Not Found
        </h1>
        <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
          {error || 'This product record is no longer available.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
        >
          Back to Search
        </button>
      </main>
    );
  }

  const primaryOffer = product.offers[0];
  const isSaved = isProductSaved(product.id);
  const isCompared = compareIds.includes(product.id);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20 space-y-12">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1.5 text-sm text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Contiguous Purchase & Intelligence Module */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 rounded-2xl overflow-hidden bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] lg:sticky lg:top-20">
          <img
            src={product.imageUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            className="w-full aspect-[4/3] object-cover"
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
              {product.brand} · <span className="capitalize">{product.category}</span> · {product.variant}
            </div>
            <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
              {product.title}
            </h1>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
              {product.summary}
            </p>
          </div>

          {/* Score + Price Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08]">
            <div>
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Best Verified Total Cost</div>
              <div className="font-mono tabular-nums text-3xl font-bold text-[#101216] dark:text-white mt-1">
                {primaryOffer ? formatCurrency(primaryOffer.totalCost, currency, primaryOffer.currency) : 'Unconfirmed'}
              </div>
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0] mt-1">
                {primaryOffer?.merchant} · {primaryOffer?.warranty}
              </div>
            </div>

            <div className="sm:border-l sm:border-black/[0.08] sm:dark:border-white/[0.08] sm:pl-5">
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">BuySmart Score</div>
              <div className="font-mono tabular-nums text-3xl font-bold text-[#15803D] dark:text-[#8BF0B0] mt-1">
                {product.score.total} / 100
              </div>
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0] mt-1">
                Confidence: {product.score.confidence}
                {product.score.recommendationCategory ? ` · ${product.score.recommendationCategory}` : ''}
              </div>
            </div>
          </div>

          {/* Primary Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={safeExternalUrl(primaryOffer?.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] hover:opacity-90"
            >
              <span>Visit {primaryOffer?.merchant || 'Store'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() => toggleCompare(product)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white cursor-pointer"
            >
              <GitCompare className="w-4 h-4" />
              <span>{isCompared ? 'Remove Compare' : 'Add to Compare'}</span>
            </button>

            <button
              type="button"
              onClick={() => void toggleSaveProduct(product)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white cursor-pointer"
            >
              <Bookmark className="w-4 h-4" />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAlertOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>Set Price Alert</span>
            </button>
          </div>

          {/* Merchant Offers Table */}
          <div className="rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] font-display text-sm font-semibold text-[#101216] dark:text-white">
              Verified Merchant Offers
            </div>
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {product.offers.map((offer, i) => (
                <div key={i} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-[#101216] dark:text-white">
                      {offer.merchant} · <span className="font-normal text-xs text-[#4B5563] dark:text-[#A0A6B0]">{offer.sellerName}</span>
                    </div>
                    <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                      {offer.deliveryEstimate} · {offer.warranty} · Retrieved {new Date(offer.retrievedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono tabular-nums font-bold text-[#101216] dark:text-white">
                        {formatCurrency(offer.totalCost, currency, offer.currency)}
                      </div>
                      <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                        {offer.shippingCost === 0 ? 'Free shipping' : `+${offer.shippingCost} shipping`}
                      </div>
                    </div>
                    <a
                      href={safeExternalUrl(offer.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-black/[0.1] dark:border-white/[0.1] hover:border-[#15803D] dark:hover:border-[#8BF0B0]"
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transparent Score Breakdown */}
          <div className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3">
            <h2 className="font-display text-base font-semibold text-[#101216] dark:text-white">
              BuySmart Score Explanation
            </h2>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">{product.aiExplanation}</p>
            <div className="space-y-2.5 pt-2">
              {product.score.dimensions.map((dim) => (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#101216] dark:text-white">
                      {dim.label} ({dim.weight}%)
                    </span>
                    <span className="font-mono tabular-nums text-[#4B5563] dark:text-[#A0A6B0]">
                      {dim.score !== null ? `${dim.score}/100` : 'Missing evidence'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-[#15803D] dark:bg-[#8BF0B0]"
                      style={{ width: `${dim.score ?? 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">{dim.evidence}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Price History & Purchasing Guidance */}
      <section className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#101216] dark:text-white">
              Price History & Purchasing Guidance
            </h2>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
              {priceStats?.guidanceText}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.06] dark:border-white/[0.06]">
            {(['7d', '30d', '90d', '1y', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPriceRange(r)}
                className={`px-3 py-1 text-xs font-mono rounded-md cursor-pointer ${
                  priceRange === r
                    ? 'bg-white dark:bg-[#171A20] text-[#101216] dark:text-white shadow-sm font-semibold'
                    : 'text-[#4B5563] dark:text-[#A0A6B0]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {priceStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Current Observed', val: priceStats.current },
              { label: 'Lowest Recorded', val: priceStats.lowest },
              { label: 'Average Recorded', val: priceStats.average },
              { label: 'Highest Recorded', val: priceStats.highest },
            ].map((stat) => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#101217]">
                <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">{stat.label}</div>
                <div className="font-mono tabular-nums text-lg font-bold text-[#101216] dark:text-white mt-1">
                  {formatCurrency(stat.val, currency, primaryOffer?.currency)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-64 w-full" data-testid="price-history-chart">
          {priceSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(160,166,176,0.2)' : 'rgba(16,18,22,0.1)'} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme === 'dark' ? '#A0A6B0' : '#4B5563' }} />
                <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#A0A6B0' : '#4B5563' }} width={64} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#171A20' : '#FFFFFF',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(16,18,22,0.12)',
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#FFFFFF' : '#101216',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={theme === 'dark' ? '#8BF0B0' : '#15803D'}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[#4B5563] dark:text-[#A0A6B0]">
              Insufficient historical price checkpoints recorded yet.
            </div>
          )}
        </div>
      </section>

      {/* AI Review Intelligence + Specifications + Shopping Safety */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Review Intelligence */}
        <section className="lg:col-span-7 rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-[#101216] dark:text-white">
                AI Review Intelligence
              </h2>
              {reviewSummary && (
                <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0] mt-1 font-mono">
                  Sample: {reviewSummary.sampleSize.toLocaleString('en-IN')} reviews · Date {reviewSummary.sampleDate} · Authenticity estimate: {reviewSummary.authenticityEstimate.label}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleAnalyzeReviews()}
              disabled={analyzingReviews}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{analyzingReviews ? 'Analyzing...' : 'Refresh Live Review Analysis'}</span>
            </button>
          </div>

          {reviewSummary && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0]">
                    Frequently Praised
                  </div>
                  <ul className="space-y-1 text-[#101216] dark:text-white/90 text-xs">
                    {reviewSummary.pros.map((p, i) => (
                      <li key={i}>+ {p}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Commonly Reported Problems
                  </div>
                  <ul className="space-y-1 text-[#101216] dark:text-white/90 text-xs">
                    {reviewSummary.cons.map((c, i) => (
                      <li key={i}>− {c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2 text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                <p><strong className="text-[#101216] dark:text-white">Durability:</strong> {reviewSummary.durabilityFeedback}</p>
                <p><strong className="text-[#101216] dark:text-white">Experience contrast:</strong> {reviewSummary.positiveVsNegativeDiff}</p>
                <p><strong className="text-[#101216] dark:text-white">Authenticity estimate note:</strong> {reviewSummary.authenticityEstimate.confidenceNote}</p>
              </div>
            </div>
          )}
        </section>

        {/* Specs + Shopping Safety + Error Report */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3">
            <h2 className="font-display text-base font-semibold text-[#101216] dark:text-white">
              Verified Specifications
            </h2>
            <dl className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="py-2 flex justify-between gap-4">
                  <dt className="text-[#4B5563] dark:text-[#A0A6B0]">{k}</dt>
                  <dd className="font-medium text-[#101216] dark:text-white text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#101216] dark:text-white">
                Shopping Safety Check
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0]">
                {product.safety.riskLevel === 'Low' ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                {product.safety.riskLevel} Risk Signal
              </span>
            </div>
            {product.safety.indicators.length === 0 ? (
              <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                No risk anomalies detected on primary offer (verified merchant domain, standard discount range, warranty disclosed).
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {product.safety.indicators.map((ind, i) => (
                  <li key={i} className="text-amber-700 dark:text-amber-300">
                    <strong>{ind.type}:</strong> {ind.explanation}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">{product.safety.disclaimer}</p>
          </div>

          <form
            onSubmit={handleReportSubmit}
            className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[#101216] dark:text-white">
              <Flag className="w-4 h-4" />
              <span>Report Inaccurate Product Info</span>
            </div>
            <select
              aria-label="Issue type"
              value={reportIssueType}
              onChange={(e) => setReportIssueType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white"
            >
              <option value="wrong_price">Outdated or incorrect price</option>
              <option value="wrong_spec">Incorrect specification</option>
              <option value="broken_link">Broken merchant link</option>
              <option value="safety_concern">Seller or listing safety concern</option>
              <option value="other">Other issue</option>
            </select>
            <textarea
              rows={2}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Describe what needs correction..."
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white"
            />
            <button
              type="submit"
              disabled={reportSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-black/[0.1] dark:border-white/[0.1] hover:border-[#15803D] dark:hover:border-[#8BF0B0] cursor-pointer"
            >
              {reportSubmitting ? 'Submitting...' : 'Submit Error Report'}
            </button>
          </form>
        </aside>
      </div>

      <PriceAlertModal product={alertOpen ? product : null} onClose={() => setAlertOpen(false)} />
    </main>
  );
};
