import React, { useState } from 'react';
import { AlertTriangle, Link2, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/i18n';
import { ProductCard } from '../components/ProductCard';
import type { BuySmartScoreBreakdown, Product, SafetyAssessment } from '../shared/types';

export const UrlAnalysisPage: React.FC = () => {
  const { currency } = useApp();
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    urlValidation: { normalizedUrl: string; merchantName: string; isSupportedMerchant: boolean };
    extracted: {
      title: string;
      brand: string;
      category: string;
      price: number | null;
      originalPrice: number | null;
      merchant: string;
      warranty: string;
      rating: number | null;
      reviewCount: number | null;
      summary: string;
      pros: string[];
      cons: string[];
      specs: Array<{ key: string; value: string }>;
      suitability: string;
      valueVerdict: string;
      groundingSources: Array<{ title: string; uri: string }>;
    };
    score: BuySmartScoreBreakdown;
    safety: SafetyAssessment;
    alternatives: Product[];
  } | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim(), currency }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'URL analysis failed');
      setAnalysis(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to analyze this URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-20 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
          Product URL Analyzer & Safety Check
        </h1>
        <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
          Paste a product link from Amazon, Flipkart, Croma, Reliance Digital, Myntra, Best Buy, or official brand stores to evaluate value, specs, and seller risk.
        </p>
      </div>

      <form
        onSubmit={handleAnalyze}
        className="rounded-2xl p-4 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col sm:flex-row gap-3"
      >
        <div className="flex items-center gap-2 flex-1">
          <Link2 className="w-4 h-4 text-[#4B5563] dark:text-[#A0A6B0] ml-2 shrink-0" />
          <label htmlFor="product-url-input" className="sr-only">Product URL</label>
          <input
            id="product-url-input"
            type="url"
            required
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.amazon.in/dp/..."
            className="w-full py-2 bg-transparent text-sm text-[#101216] dark:text-white focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {loading ? 'Analyzing URL...' : 'Analyze Listing'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/25 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {analysis && (
        <div className="space-y-8">
          <section className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                  {analysis.urlValidation.merchantName} · {analysis.extracted.brand} · {analysis.extracted.warranty}
                </div>
                <h2 className="font-display text-2xl font-bold text-[#101216] dark:text-white mt-1">
                  {analysis.extracted.title}
                </h2>
              </div>
              <div className="text-right">
                <div className="font-mono tabular-nums text-2xl font-bold text-[#15803D] dark:text-[#8BF0B0]">
                  {analysis.score.total} / 100
                </div>
                <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                  Confidence: {analysis.score.confidence}
                </div>
              </div>
            </div>

            {analysis.extracted.price !== null && (
              <div className="font-mono tabular-nums text-xl font-bold text-[#101216] dark:text-white">
                Observed Price: {formatCurrency(analysis.extracted.price, currency)}
              </div>
            )}

            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
              {analysis.extracted.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#101217] space-y-1.5">
                <div className="text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0]">Advantages</div>
                {analysis.extracted.pros.map((p, i) => (
                  <div key={i} className="text-xs text-[#101216] dark:text-white/90">+ {p}</div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#101217] space-y-1.5">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">Limitations</div>
                {analysis.extracted.cons.map((c, i) => (
                  <div key={i} className="text-xs text-[#101216] dark:text-white/90">− {c}</div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-[#101216] dark:text-white">Suitability: </span>
                <span className="text-[#4B5563] dark:text-[#A0A6B0]">{analysis.extracted.suitability}</span>
              </div>
              <div>
                <span className="font-semibold text-[#101216] dark:text-white">Value Verdict: </span>
                <span className="text-[#4B5563] dark:text-[#A0A6B0]">{analysis.extracted.valueVerdict}</span>
              </div>
            </div>

            {/* Safety Risk Block */}
            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#101216] dark:text-white">
                {analysis.safety.riskLevel === 'Low' ? (
                  <ShieldCheck className="w-4 h-4 text-[#15803D] dark:text-[#8BF0B0]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <span>Shopping Safety Assessment: {analysis.safety.riskLevel} Risk Signal</span>
              </div>
              {analysis.safety.indicators.map((ind, i) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-300">
                  {ind.type}: {ind.explanation}
                </p>
              ))}
              <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">{analysis.safety.disclaimer}</p>
            </div>
          </section>

          {analysis.alternatives.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#101216] dark:text-white">
                Verified Alternatives to Consider
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analysis.alternatives.map((alt) => (
                  <ProductCard key={alt.id} product={alt} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
};
