import React, { useEffect, useMemo, useState } from 'react';
import {
  Filter,
  GitCompare,
  LayoutGrid,
  List,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { safeExternalUrl } from '../lib/i18n';
import { ProductCard } from '../components/ProductCard';
import { AssistantPanel } from '../components/AssistantPanel';
import { PriceAlertModal } from '../components/PriceAlertModal';
import type { CategoryId, Product, SearchResponse } from '../shared/types';

export const SearchResultsPage: React.FC = () => {
  const { route, navigate, currency, t, compareIds, recordSearchHistory } = useApp();

  const searchParams = useMemo(() => new URLSearchParams(route.split('?')[1] || ''), [route]);
  const initialQ = searchParams.get('q') || '';
  const initialCat = (searchParams.get('category') || '') as CategoryId | '';
  const initialBudget = searchParams.get('budget') || '';

  const [queryInput, setQueryInput] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  // Filters & Layout
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'relevance' | 'score' | 'price_asc' | 'price_desc' | 'rating'>('relevance');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>(initialBudget);
  const [warrantyOnly, setWarrantyOnly] = useState<boolean>(false);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [alertProduct, setAlertProduct] = useState<Product | null>(null);

  const [refiningLive, setRefiningLive] = useState(false);

  const executeSearch = async (q: string, cat?: string, budgetVal?: string) => {
    setLoading(true);
    setRefiningLive(false);
    setError(null);
    const bodyPayload = {
      query: q || (cat ? `Best ${cat}` : 'Best electronics'),
      category: cat || undefined,
      budget: budgetVal ? Number(budgetVal) : undefined,
      currency,
      country: currency === 'INR' ? 'India' : 'Global',
    };

    try {
      // Phase 1: Instant verified catalog & deterministic intent match
      const fastResp = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bodyPayload, live: false }),
      });
      const fastData = await fastResp.json();
      if (!fastResp.ok) throw new Error(fastData.error || 'Search failed');
      setResult(fastData);
      setLoading(false);

      if (q) {
        void recordSearchHistory({
          query: q,
          category: fastData.intent?.category,
          budget: fastData.intent?.budget,
          currency,
          resultCount: fastData.products?.length ?? 0,
        });
      }

      // Phase 2: Non-blocking live Google Search Grounding enrichment
      if (q && q.trim().length >= 4) {
        setRefiningLive(true);
        fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...bodyPayload, live: true }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((liveData) => {
            if (liveData?.products?.length) {
              setResult(liveData);
            }
          })
          .catch(() => {})
          .finally(() => setRefiningLive(false));
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to fetch shopping research results.');
      setLoading(false);
    }
  };

  useEffect(() => {
    setQueryInput(initialQ);
    setMaxPriceFilter(initialBudget);
    void executeSearch(initialQ, initialCat, initialBudget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ, initialCat, initialBudget, currency]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    (result?.products ?? []).forEach((p) => set.add(p.brand));
    return Array.from(set);
  }, [result]);

  const filteredProducts = useMemo(() => {
    let list = [...(result?.products ?? [])];
    if (selectedBrand !== 'all') {
      list = list.filter((p) => p.brand === selectedBrand);
    }
    if (minRating > 0) {
      list = list.filter((p) => (p.rating ?? 0) >= minRating);
    }
    if (maxPriceFilter && Number(maxPriceFilter) > 0) {
      const cap = Number(maxPriceFilter);
      list = list.filter((p) => (p.offers[0]?.totalCost ?? 0) <= cap);
    }
    if (warrantyOnly) {
      list = list.filter(
        (p) => p.offers[0]?.warranty && !p.offers[0].warranty.toLowerCase().includes('unknown'),
      );
    }

    if (sortBy === 'score') list.sort((a, b) => b.score.total - a.score.total);
    else if (sortBy === 'price_asc')
      list.sort((a, b) => (a.offers[0]?.totalCost ?? 0) - (b.offers[0]?.totalCost ?? 0));
    else if (sortBy === 'price_desc')
      list.sort((a, b) => (b.offers[0]?.totalCost ?? 0) - (a.offers[0]?.totalCost ?? 0));
    else if (sortBy === 'rating') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return list;
  }, [result, selectedBrand, minRating, maxPriceFilter, warrantyOnly, sortBy]);

  const contextSummary = useMemo(() => {
    const items = filteredProducts.slice(0, 4).map(
      (p) =>
        `${p.title} (${p.offers[0]?.price} ${p.offers[0]?.currency}, BuySmart Score ${p.score.total}/100, Pros: ${p.pros.join('; ')}, Cons: ${p.cons.join('; ')})`,
    );
    return `Query: "${queryInput || initialCat}". Top visible candidates:\n${items.join('\n')}`;
  }, [filteredProducts, queryInput, initialCat]);

  const FilterPanel = (
    <div className="space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-[#101216] dark:text-white">
          {t.filters}
        </h2>
        <button
          type="button"
          onClick={() => {
            setSelectedBrand('all');
            setMinRating(0);
            setMaxPriceFilter('');
            setWarrantyOnly(false);
          }}
          className="text-xs text-[#15803D] dark:text-[#8BF0B0] hover:underline cursor-pointer"
        >
          Reset
        </button>
      </div>

      <div>
        <label htmlFor="filter-max-price" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1.5">
          Max Budget ({currency})
        </label>
        <input
          id="filter-max-price"
          type="number"
          placeholder="e.g. 20000"
          value={maxPriceFilter}
          onChange={(e) => setMaxPriceFilter(e.target.value)}
          className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="filter-brand" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1.5">
          Brand
        </label>
        <select
          id="filter-brand"
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white"
        >
          <option value="all">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-rating" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1.5">
          Minimum Customer Rating
        </label>
        <select
          id="filter-rating"
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white"
        >
          <option value={0}>Any rating</option>
          <option value={4}>4.0+ stars</option>
          <option value={4.4}>4.4+ stars</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs text-[#101216] dark:text-white cursor-pointer">
        <input
          type="checkbox"
          checked={warrantyOnly}
          onChange={(e) => setWarrantyOnly(e.target.checked)}
          className="rounded accent-[#15803D] dark:accent-[#8BF0B0]"
        />
        <span>Verified manufacturer warranty</span>
      </label>
    </div>
  );

  return (
    <main className="mx-auto max-w-[1440px] px-4 sm:px-6 pt-6 pb-20 space-y-6">
      {/* Top Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate(`/search?q=${encodeURIComponent(queryInput.trim())}`);
        }}
        className="flex flex-wrap items-center gap-3 rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] p-3"
      >
        <Search className="w-4 h-4 text-[#4B5563] dark:text-[#A0A6B0] ml-2" aria-hidden="true" />
        <label htmlFor="workspace-search-input" className="sr-only">
          Search products
        </label>
        <input
          id="workspace-search-input"
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="flex-1 min-w-[200px] bg-transparent text-sm text-[#101216] dark:text-white focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
        >
          {t.searchButton}
        </button>
      </form>

      {/* Clarifying question or upstream notice */}
      {result?.intent?.clarifyingQuestions && result.intent.clarifyingQuestions.length > 0 && (
        <div className="rounded-xl p-4 bg-[#15803D]/10 dark:bg-[#8BF0B0]/10 border border-[#15803D]/25 dark:border-[#8BF0B0]/25 text-sm text-[#101216] dark:text-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold">Quick clarification to refine matches: </span>
            {result.intent.clarifyingQuestions[0]}
          </div>
          <div className="flex gap-2">
            {['Under ₹20,000', 'Under ₹50,000'].map((ans) => (
              <button
                key={ans}
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(`${queryInput} ${ans}`)}`)}
                className="px-3 py-1 text-xs font-medium rounded-md bg-white dark:bg-[#171A20] border border-black/[0.1] dark:border-white/[0.1] cursor-pointer"
              >
                {ans}
              </button>
            ))}
          </div>
        </div>
      )}

      {result?.notice && (
        <div className="rounded-xl px-4 py-3 text-xs bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200">
          {result.notice}
        </div>
      )}

      {/* Workspace Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-[#4B5563] dark:text-[#A0A6B0]">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{t.filters}</span>
          </button>
          <span className="font-mono tabular-nums">
            {loading
              ? 'Researching...'
              : `${filteredProducts.length} verified results${refiningLive ? ' · Checking live listings...' : ''}`}
          </span>
          {result?.sourceMode && !refiningLive && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Source:{' '}
                {result.sourceMode === 'hybrid'
                  ? 'Live Search + Verified Catalog'
                  : result.sourceMode === 'live_grounded'
                    ? 'Live Google Search Grounding'
                    : 'Verified Catalog'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="sort-select">Sort products</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#171A20] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white cursor-pointer"
          >
            <option value="relevance">{t.sortRelevance}</option>
            <option value="score">{t.sortScore}</option>
            <option value="price_asc">{t.sortPriceAsc}</option>
            <option value="price_desc">{t.sortPriceDesc}</option>
            <option value="rating">{t.sortRating}</option>
          </select>

          <div className="flex items-center rounded-lg border border-black/[0.1] dark:border-white/[0.1] overflow-hidden">
            <button
              type="button"
              onClick={() => setLayout('grid')}
              aria-label="Grid view"
              className={`p-1.5 cursor-pointer ${layout === 'grid' ? 'bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B]' : 'bg-white dark:bg-[#171A20] text-[#4B5563] dark:text-[#A0A6B0]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayout('list')}
              aria-label="List view"
              className={`p-1.5 cursor-pointer ${layout === 'list' ? 'bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B]' : 'bg-white dark:bg-[#171A20] text-[#4B5563] dark:text-[#A0A6B0]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAssistantOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#171A20] text-[#101216] dark:text-white cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{assistantOpen ? 'Hide AI' : 'Show AI'}</span>
          </button>
        </div>
      </div>

      {/* 3-Panel Desktop Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Filters */}
        <aside className="hidden lg:block lg:col-span-2 rounded-2xl p-4 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] sticky top-20">
          {FilterPanel}
        </aside>

        {/* Center Results */}
        <section className={`${assistantOpen ? 'lg:col-span-6' : 'lg:col-span-10'} space-y-6`}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl p-8 text-center bg-white dark:bg-[#171A20] border border-red-500/30 space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => void executeSearch(queryInput, initialCat, initialBudget)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
              >
                Retry Research
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl p-10 text-center bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3">
              <h3 className="font-display text-lg font-semibold text-[#101216] dark:text-white">
                No matching products within current filters
              </h3>
              <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
                Try raising your budget filter or resetting brand constraints.
              </p>
            </div>
          ) : (
            <div
              className={
                layout === 'grid'
                  ? `grid grid-cols-1 ${assistantOpen ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-5`
                  : 'space-y-4'
              }
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  layout={layout}
                  onSetAlert={setAlertProduct}
                />
              ))}
            </div>
          )}

          {/* Grounding Citations if present */}
          {result?.products.some((p) => p.groundingSources && p.groundingSources.length > 0) && (
            <div className="rounded-xl p-4 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-2">
              <div className="text-xs font-semibold text-[#101216] dark:text-white">
                Verified Search Grounding Sources
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {result.products
                  .flatMap((p) => p.groundingSources ?? [])
                  .slice(0, 6)
                  .map((src, i) => (
                    <a
                      key={i}
                      href={safeExternalUrl(src.uri, 'https://www.google.com')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#15803D] dark:text-[#8BF0B0] hover:underline truncate max-w-xs"
                    >
                      {src.title}
                    </a>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* Right AI Shopping Assistant */}
        {assistantOpen && (
          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <AssistantPanel
              contextSummary={contextSummary}
              sessionTitle={queryInput || 'Shopping Search'}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet Filters */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end lg:hidden">
          <div className="w-full rounded-t-2xl bg-white dark:bg-[#171A20] p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-1.5 rounded-lg border border-black/[0.1] dark:border-white/[0.1]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {FilterPanel}
          </div>
        </div>
      )}

      {/* Sticky Compare Bar (compact, under mobile sticky cap) */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-xl bg-[#101216] dark:bg-[#171A20] text-white border border-white/15 px-4 py-2.5 shadow-xl flex items-center gap-4">
          <span className="text-xs font-mono tabular-nums">
            {compareIds.length} product{compareIds.length > 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={() => navigate('/compare')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#8BF0B0] text-[#08090B] cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Now</span>
          </button>
        </div>
      )}

      <PriceAlertModal product={alertProduct} onClose={() => setAlertProduct(null)} />
    </main>
  );
};
