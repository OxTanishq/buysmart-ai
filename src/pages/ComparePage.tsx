import React, { useEffect, useState } from 'react';
import { Printer, Share2, Trash2 } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/i18n';
import type { Product, ScoreWeights } from '../shared/types';

export const ComparePage: React.FC = () => {
  const {
    route,
    navigate,
    currency,
    compareIds,
    compareProductsCache,
    toggleCompare,
    clearCompare,
    priorityWeights,
    setPriorityWeights,
    user,
    showToast,
  } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [winnerId, setWinnerId] = useState<string>('');
  const [conclusion, setConclusion] = useState<string>('');
  const [fitMatrix, setFitMatrix] = useState<Array<{ persona: string; productTitle: string; reason: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<'balanced' | 'performance' | 'value' | 'longevity'>('balanced');

  const urlIds = new URLSearchParams(route.split('?')[1] || '').get('ids');
  const activeIds = urlIds ? urlIds.split(',').filter(Boolean).slice(0, 6) : compareIds;

  useEffect(() => {
    if (activeIds.length < 2) {
      setProducts([]);
      return;
    }
    let active = true;
    setLoading(true);
    fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productIds: activeIds,
        products: activeIds.map((id) => compareProductsCache[id]).filter(Boolean),
        priorities: priorityWeights,
        currency,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data.products)) {
          setProducts(data.products);
          setWinnerId(data.winnerId || '');
          setConclusion(data.conclusion || '');
          setFitMatrix(data.fitMatrix || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeIds.join(','), priorityWeights, currency]);

  const applyPreset = (preset: 'balanced' | 'performance' | 'value' | 'longevity') => {
    setActivePreset(preset);
    const map: Record<string, ScoreWeights> = {
      balanced: { performance: 0.25, value: 0.25, requirementsMatch: 0.25, reliability: 0.1, reviewQuality: 0.1, warrantySupport: 0.05 },
      performance: { performance: 0.45, value: 0.15, requirementsMatch: 0.2, reliability: 0.1, reviewQuality: 0.05, warrantySupport: 0.05 },
      value: { performance: 0.15, value: 0.45, requirementsMatch: 0.2, reliability: 0.1, reviewQuality: 0.05, warrantySupport: 0.05 },
      longevity: { performance: 0.15, value: 0.15, requirementsMatch: 0.2, reliability: 0.25, reviewQuality: 0.1, warrantySupport: 0.15 },
    };
    setPriorityWeights(map[preset]);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/compare?ids=${activeIds.join(',')}`;
    await navigator.clipboard?.writeText(url).catch(() => {});
    if (user) {
      const docId = `cmp_${user.uid}_${Date.now()}`;
      try {
        await setDoc(doc(db, 'comparisons', docId), {
          userId: user.uid,
          title: products.map((p) => p.brand).join(' vs ') || 'Product Comparison',
          productIds: activeIds,
          priorities: priorityWeights,
          isPublic: true,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `comparisons/${docId}`);
      }
    }
    showToast('Shareable comparison link copied to clipboard');
  };

  const allSpecKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.specs))),
  ).slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
            Side-by-Side Comparison
          </h1>
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
            Compare up to 6 products across total cost, specifications, warranty, and long-term value.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={products.length < 2}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white disabled:opacity-40 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Comparison</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={products.length < 2}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white disabled:opacity-40 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          {compareIds.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Priority Weight Selector */}
      <div className="rounded-2xl p-4 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0]">
          Adjust Comparison Priority:
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'balanced', label: 'Balanced Default' },
            { id: 'performance', label: 'Performance First' },
            { id: 'value', label: 'Budget & Value' },
            { id: 'longevity', label: 'Long-Term Reliability' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                activePreset === preset.id
                  ? 'bg-[#15803D] border-[#15803D] text-white dark:bg-[#8BF0B0] dark:border-[#8BF0B0] dark:text-[#08090B]'
                  : 'bg-[#F7F8FA] dark:bg-[#101217] border-black/[0.08] dark:border-white/[0.08] text-[#101216] dark:text-white hover:border-[#15803D] dark:hover:border-[#8BF0B0]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {activeIds.length < 2 ? (
        <div className="rounded-2xl p-12 text-center bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#101216] dark:text-white">
            Select at least 2 products to compare
          </h2>
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
            Click Compare on any product card in Search or Deals to add it here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/search?q=smartphone')}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
          >
            Browse Products
          </button>
        </div>
      ) : loading && products.length === 0 ? (
        <div className="h-72 rounded-2xl bg-white dark:bg-[#171A20] animate-pulse" />
      ) : (
        <>
          {/* AI Conclusion */}
          {conclusion && (
            <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-[#15803D]/30 dark:border-[#8BF0B0]/30 space-y-3">
              <div className="text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0]">
                AI Comparison Conclusion
              </div>
              <p className="text-sm text-[#101216] dark:text-white leading-relaxed">{conclusion}</p>
              {fitMatrix.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {fitMatrix.map((fit, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#F7F8FA] dark:bg-[#101217] text-xs space-y-1">
                      <div className="font-semibold text-[#101216] dark:text-white">{fit.persona}</div>
                      <div className="text-[#15803D] dark:text-[#8BF0B0] font-medium">{fit.productTitle}</div>
                      <div className="text-[#4B5563] dark:text-[#A0A6B0]">{fit.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Side-by-Side Comparison Table */}
          <div className="rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-black/[0.08] dark:border-white/[0.08]">
                  <th className="p-4 text-xs font-semibold text-[#4B5563] dark:text-[#A0A6B0] w-44">
                    Attribute
                  </th>
                  {products.map((p) => (
                    <th key={p.id} className="p-4 align-top min-w-[200px]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-[#15803D] dark:text-[#8BF0B0]">
                            {p.id === winnerId ? 'Top Ranked Match' : p.brand}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCompare(p)}
                            aria-label={`Remove ${p.title} from comparison`}
                            className="text-xs text-[#4B5563] dark:text-[#A0A6B0] hover:text-red-500 no-print cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${p.id}`)}
                          className="font-display text-sm font-bold text-[#101216] dark:text-white hover:underline text-left cursor-pointer"
                        >
                          {p.title}
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
                <tr>
                  <td className="p-4 font-medium text-[#4B5563] dark:text-[#A0A6B0]">Current Total Cost</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 font-mono tabular-nums text-sm font-bold text-[#101216] dark:text-white">
                      {p.offers[0] ? formatCurrency(p.offers[0].totalCost, currency, p.offers[0].currency) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-medium text-[#4B5563] dark:text-[#A0A6B0]">BuySmart Score</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 font-mono tabular-nums font-semibold text-[#15803D] dark:text-[#8BF0B0]">
                      {p.score.total} / 100 ({p.score.confidence})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-medium text-[#4B5563] dark:text-[#A0A6B0]">Customer Rating</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 font-mono tabular-nums text-[#101216] dark:text-white">
                      {p.rating !== null ? `${p.rating.toFixed(1)}/5 (${p.reviewCount?.toLocaleString('en-IN') ?? 0})` : 'Not verified'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-medium text-[#4B5563] dark:text-[#A0A6B0]">Warranty</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-[#101216] dark:text-white">
                      {p.offers[0]?.warranty || 'Check listing'}
                    </td>
                  ))}
                </tr>
                {allSpecKeys.map((key) => (
                  <tr key={key}>
                    <td className="p-4 font-medium text-[#4B5563] dark:text-[#A0A6B0]">{key}</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-4 text-[#101216] dark:text-white">
                        {p.specs[key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="p-4 font-medium text-[#4B5563] dark:text-[#A0A6B0]">Key Advantages</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-[#15803D] dark:text-[#8BF0B0] space-y-1 align-top">
                      {p.pros.map((pro, idx) => (
                        <div key={idx}>+ {pro}</div>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-medium text-[#4B5563] dark:text-[#A0A6B0]">Limitations</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-amber-700 dark:text-amber-300 space-y-1 align-top">
                      {p.cons.map((con, idx) => (
                        <div key={idx}>− {con}</div>
                      ))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
};
