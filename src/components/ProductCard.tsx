import React, { useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Package,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, safeExternalUrl } from '../lib/i18n';
import type { Product } from '../shared/types';

interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'list';
  onSetAlert?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  layout = 'grid',
  onSetAlert,
}) => {
  const { currency, t, navigate, compareIds, toggleCompare, toggleSaveProduct, isProductSaved } =
    useApp();
  const [imgError, setImgError] = useState(false);
  const [scoreExpanded, setScoreExpanded] = useState(false);

  const primaryOffer = product.offers[0];
  const isCompared = compareIds.includes(product.id);
  const isSaved = isProductSaved(product.id);
  const specEntries = Object.entries(product.specs).slice(0, 3);

  const safeStoreUrl = safeExternalUrl(primaryOffer?.url);

  const handleRecordClick = () => {
    void fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, merchant: primaryOffer?.merchant }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <article
      className={`group rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-black/40 overflow-hidden flex ${
        layout === 'list' ? 'flex-col md:flex-row' : 'flex-col'
      }`}
    >
      {/* Product Image Area */}
      <button
        type="button"
        onClick={() => navigate(`/product/${product.id}`)}
        aria-label={`View details for ${product.title}`}
        className={`relative bg-[#F1F3F5] dark:bg-[#101217] overflow-hidden cursor-pointer text-left ${
          layout === 'list' ? 'md:w-72 shrink-0 aspect-[4/3]' : 'w-full aspect-[4/3]'
        }`}
      >
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-[#4B5563] dark:text-[#A0A6B0]">
            <Package className="w-8 h-8 opacity-60" />
            <span className="text-xs font-medium text-center">{product.brand}</span>
          </div>
        )}
      </button>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          {/* Unboxed typographic metadata (Zero-Pill discipline) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563] dark:text-[#A0A6B0]">
            <span>
              {product.brand}
              <span aria-hidden="true"> · </span>
              <span className="capitalize">{product.category}</span>
              {product.score.recommendationCategory && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="font-semibold text-[#15803D] dark:text-[#8BF0B0]">
                    {product.score.recommendationCategory}
                  </span>
                </>
              )}
              {product.sponsored && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>Sponsored</span>
                </>
              )}
            </span>

            <span className="font-mono tabular-nums text-xs font-semibold text-[#101216] dark:text-white">
              Score {product.score.total}/100 ({product.score.confidence})
            </span>
          </div>

          {/* Title & Variant */}
          <div>
            <h3 className="font-display text-base font-semibold text-[#101216] dark:text-white leading-snug">
              <button
                type="button"
                onClick={() => navigate(`/product/${product.id}`)}
                className="text-left hover:text-[#15803D] dark:hover:text-[#8BF0B0] transition-colors cursor-pointer"
              >
                {product.title}
              </button>
            </h3>
            <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0] mt-0.5">{product.variant}</p>
          </div>

          {/* Price & Rating Row */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 pt-1">
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono tabular-nums text-xl font-bold text-[#101216] dark:text-white">
                {primaryOffer?.price
                  ? formatCurrency(primaryOffer.price, currency, primaryOffer.currency)
                  : 'Price unconfirmed'}
              </span>
              {primaryOffer?.originalPrice && primaryOffer.originalPrice > primaryOffer.price && (
                <>
                  <span className="font-mono tabular-nums text-xs line-through text-[#4B5563] dark:text-[#A0A6B0]">
                    {formatCurrency(primaryOffer.originalPrice, currency, primaryOffer.currency)}
                  </span>
                  {primaryOffer.discountPct && primaryOffer.discountPct > 0 && (
                    <span className="font-mono tabular-nums text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0]">
                      -{primaryOffer.discountPct}%
                    </span>
                  )}
                </>
              )}
            </div>

            {product.rating !== null ? (
              <div className="flex items-center gap-1 text-xs text-[#4B5563] dark:text-[#A0A6B0] font-mono tabular-nums">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="font-semibold text-[#101216] dark:text-white">
                  {product.rating.toFixed(1)}
                </span>
                {product.reviewCount !== null && (
                  <span>({product.reviewCount.toLocaleString('en-IN')})</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                Reviews not verified
              </span>
            )}
          </div>

          {/* Key Specs */}
          {specEntries.length > 0 && (
            <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
              {specEntries.map(([k, v], i) => (
                <span key={k}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  <span className="text-[#101216] dark:text-white/90 font-medium">{k}:</span> {v}
                </span>
              ))}
            </div>
          )}

          {/* AI Explanation */}
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
            {product.aiExplanation}
          </p>

          {/* Pros & Cons compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
            {product.pros[0] && (
              <div className="text-[#15803D] dark:text-[#8BF0B0]">
                + {product.pros[0]}
              </div>
            )}
            {product.cons[0] && (
              <div className="text-amber-700 dark:text-amber-300">
                − {product.cons[0]}
              </div>
            )}
          </div>

          {/* Expandable Score Breakdown */}
          <div>
            <button
              type="button"
              onClick={() => setScoreExpanded((v) => !v)}
              aria-expanded={scoreExpanded}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white cursor-pointer"
            >
              <span>Why {product.score.total}/100?</span>
              {scoreExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {scoreExpanded && (
              <div className="mt-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1.5 text-xs">
                {product.score.dimensions.map((d) => (
                  <div key={d.key} className="flex items-start justify-between gap-3">
                    <span className="text-[#4B5563] dark:text-[#A0A6B0]">
                      {d.label} ({d.weight}%)
                    </span>
                    <span className="font-mono tabular-nums text-[#101216] dark:text-white shrink-0">
                      {d.score !== null ? `${d.score}/100` : 'Missing'}
                    </span>
                  </div>
                ))}
                {product.score.missingEvidence.length > 0 && (
                  <p className="text-amber-700 dark:text-amber-300 pt-1">
                    Missing evidence: {product.score.missingEvidence.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Merchant Provenance + Action Bar */}
        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563] dark:text-[#A0A6B0]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D] dark:text-[#8BF0B0]" aria-hidden="true" />
              {primaryOffer?.merchant} · {primaryOffer?.sellerName} · {primaryOffer?.warranty}
            </span>
            <span className="font-mono tabular-nums">
              {primaryOffer?.deliveryEstimate} · Updated {new Date(product.retrievedAt).toLocaleDateString('en-IN')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCompare(product)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isCompared
                  ? 'bg-[#15803D]/10 border-[#15803D] text-[#15803D] dark:bg-[#8BF0B0]/15 dark:border-[#8BF0B0] dark:text-[#8BF0B0]'
                  : 'border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isCompared ? t.comparedBtn : t.compareBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => void toggleSaveProduct(product)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSaved
                  ? 'bg-[#15803D]/10 border-[#15803D] text-[#15803D] dark:bg-[#8BF0B0]/15 dark:border-[#8BF0B0] dark:text-[#8BF0B0]'
                  : 'border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSaved ? t.savedBtn : t.saveBtn}</span>
            </button>

            {onSetAlert && (
              <button
                type="button"
                onClick={() => onSetAlert(product)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{t.alertBtn}</span>
              </button>
            )}

            <a
              href={safeStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleRecordClick}
              className="ml-auto inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.visitStore}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
