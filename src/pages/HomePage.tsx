import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Camera,
  ChevronDown,
  Globe,
  Link2,
  Mic,
  Moon,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  TrendingDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import { PriceAlertModal } from '../components/PriceAlertModal';
import type { CategoryInfo, CurrencyCode, LanguageCode, Product } from '../shared/types';

export const HomePage: React.FC = () => {
  const {
    navigate,
    t,
    currency,
    setCurrency,
    language,
    setLanguage,
    theme,
    toggleTheme,
    showToast,
  } = useApp();

  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [listening, setListening] = useState(false);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([
    'Find the best smartphone under ₹20,000',
    'Laptop for coding, gaming and schoolwork under ₹50,000',
    'Comfortable shoes suitable for daily use',
    'Gift for my father under ₹2,000',
    'Build a complete gaming setup under ₹80,000',
  ]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [alertProduct, setAlertProduct] = useState<Product | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/deals').then((r) => r.json()),
    ])
      .then(([catData, dealData]) => {
        if (!active) return;
        if (Array.isArray(catData.categories)) setCategories(catData.categories);
        if (Array.isArray(dealData.deals)) setDeals(dealData.deals);
        if (Array.isArray(dealData.popularSearches)) setPopularSearches(dealData.popularSearches);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setDealsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const submitSearch = (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed) {
      showToast('Enter what you are looking to buy');
      return;
    }
    const params = new URLSearchParams();
    params.set('q', trimmed);
    if (budget) params.set('budget', budget);
    params.set('currency', currency);
    navigate(`/search?${params.toString()}`);
  };

  const handleVoiceInput = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Voice input is not supported in this browser.');
      return;
    }
    const rec = new SpeechRec();
    rec.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setQuery(transcript);
        submitSearch(transcript);
      }
      setListening(false);
    };
    rec.onerror = () => {
      setListening(false);
      showToast('Could not capture audio. Try typing your query.');
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16 space-y-20">
      {/* Hero Section */}
      <section className="space-y-8">
        {/* Compact Utility Bar (kept outside Top Bar to preserve clean 3-zone header) */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#4B5563] dark:text-[#A0A6B0]">
          <span>Nexora Studios · Independent Shopping Intelligence · India-first & Global</span>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#101217]">
              <Globe className="w-3.5 h-3.5" />
              <span className="sr-only">Language</span>
              <select
                aria-label="Language selector"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-[#101216] dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-white dark:bg-[#171A20]">EN</option>
                <option value="hi" className="bg-white dark:bg-[#171A20]">HI</option>
              </select>
            </label>

            <label className="inline-flex items-center px-2.5 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#101217]">
              <span className="sr-only">Currency</span>
              <select
                aria-label="Currency selector"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="bg-transparent font-mono text-[#101216] dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="INR" className="bg-white dark:bg-[#171A20]">INR ₹</option>
                <option value="USD" className="bg-white dark:bg-[#171A20]">USD $</option>
                <option value="EUR" className="bg-white dark:bg-[#171A20]">EUR €</option>
                <option value="GBP" className="bg-white dark:bg-[#171A20]">GBP £</option>
              </select>
            </label>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#101217] text-[#101216] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Main Hero Split: Search & Value Prop + Editorial Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="space-y-3">
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#101216] dark:text-white leading-[1.08]">
                {t.heroHeading}
              </h1>
              <p className="text-base sm:text-lg text-[#4B5563] dark:text-[#A0A6B0] max-w-2xl leading-relaxed">
                {t.heroSub}
              </p>
            </div>

            {/* Central AI Search Card */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch(query);
              }}
              className="rounded-2xl bg-white/90 dark:bg-[#171A20]/90 backdrop-blur-md border border-black/[0.1] dark:border-white/[0.1] p-3 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-[#4B5563] dark:text-[#A0A6B0] ml-2 shrink-0" aria-hidden="true" />
                <label htmlFor="hero-search-input" className="sr-only">
                  Natural language shopping search
                </label>
                <input
                  id="hero-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full py-2.5 bg-transparent text-sm sm:text-base text-[#101216] dark:text-white placeholder:text-[#4B5563]/70 dark:placeholder:text-[#A0A6B0]/70 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.08] dark:border-white/[0.08] text-[#101216] dark:text-white">
                    <span className="text-[#4B5563] dark:text-[#A0A6B0]">Budget:</span>
                    <select
                      aria-label="Budget selector"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="bg-transparent font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-[#171A20]">Any</option>
                      <option value="2000" className="bg-white dark:bg-[#171A20]">≤ 2,000</option>
                      <option value="10000" className="bg-white dark:bg-[#171A20]">≤ 10,000</option>
                      <option value="20000" className="bg-white dark:bg-[#171A20]">≤ 20,000</option>
                      <option value="50000" className="bg-white dark:bg-[#171A20]">≤ 50,000</option>
                      <option value="80000" className="bg-white dark:bg-[#171A20]">≤ 80,000</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => navigate('/image-search')}
                    title="Search by product image"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/url-analysis')}
                    title="Analyze a product URL"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>URL</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    aria-label="Voice search"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      listening
                        ? 'border-[#15803D] text-[#15803D] dark:border-[#8BF0B0] dark:text-[#8BF0B0]'
                        : 'border-black/[0.08] dark:border-white/[0.08] text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{listening ? 'Listening...' : 'Voice'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{t.searchButton}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Popular Shopping Requests */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0]">
                Popular shopping searches
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setQuery(ex);
                      submitSearch(ex);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#101217] border border-black/[0.08] dark:border-white/[0.08] text-[#101216] dark:text-white/90 hover:border-[#15803D] dark:hover:border-[#8BF0B0] transition-colors text-left cursor-pointer"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Editorial Tech Flatlay */}
          <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-[#101217] relative min-h-[280px]">
            <img
              src="/src/assets/images/hero_tech_flatlay_1795485451285.jpg"
              alt="Curated flagship laptop, smartphone, and wireless ANC headphones studio layout"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-6">
              <div className="text-xs font-mono text-[#8BF0B0]">Verified Research Engine</div>
              <div className="font-display text-lg font-semibold text-white mt-1">
                Transparent BuySmart Scores, Real Price History & Multi-Merchant Verification
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories Grid */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#101216] dark:text-white">
              {t.categoriesTitle}
            </h2>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
              Category-weighted scoring adjusts automatically for technical specs, durability, or ergonomics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="text-sm font-medium text-[#15803D] dark:text-[#8BF0B0] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            View all categories
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.slice(0, 8).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/search?category=${cat.id}`)}
              className="text-left rounded-xl p-4 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#15803D] dark:hover:border-[#8BF0B0] transition-colors cursor-pointer"
            >
              <div className="font-display text-sm font-semibold text-[#101216] dark:text-white">
                {language === 'hi' ? cat.nameHi : cat.name}
              </div>
              <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0] mt-1 line-clamp-2">
                {cat.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Recently Verified Deals */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#101216] dark:text-white">
              {t.dealsTitle}
            </h2>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
              Every listing shows verified merchant source, warranty duration, and retrieval timestamp.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/price-tracker')}
            className="text-sm font-medium text-[#15803D] dark:text-[#8BF0B0] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Open price tracker
          </button>
        </div>

        {dealsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-96 rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((product) => (
              <ProductCard key={product.id} product={product} onSetAlert={setAlertProduct} />
            ))}
          </div>
        )}
      </section>

      {/* How BuySmart Works + Intelligence Tools Preview */}
      <section className="space-y-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#101216] dark:text-white">
            {t.howItWorksTitle}
          </h2>
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
            Built to minimize research time while keeping every recommendation explainable and unbiased.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3">
            <SlidersHorizontal className="w-5 h-5 text-[#15803D] dark:text-[#8BF0B0]" />
            <h3 className="font-display text-base font-semibold text-[#101216] dark:text-white">
              01. Transparent BuySmart Score
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
              Evaluates Performance (25%), Value (25%), Requirements Match (25%), Reliability (10%), Review Quality (10%), and Warranty (5%). Missing evidence is flagged explicitly.
            </p>
            <button
              type="button"
              onClick={() => navigate('/compare')}
              className="text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0] hover:underline cursor-pointer"
            >
              Try multi-product comparison →
            </button>
          </div>

          <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3">
            <TrendingDown className="w-5 h-5 text-[#15803D] dark:text-[#8BF0B0]" />
            <h3 className="font-display text-base font-semibold text-[#101216] dark:text-white">
              02. Multi-Period Price Intelligence
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
              Track recorded lows, highs, and averages over 7d, 30d, 90d, and 1y windows with honest buy-now vs wait guidance and custom target-price alerts.
            </p>
            <button
              type="button"
              onClick={() => navigate('/cart-optimizer')}
              className="text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0] hover:underline cursor-pointer"
            >
              Optimize a multi-item setup →
            </button>
          </div>

          <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3">
            <ShieldCheck className="w-5 h-5 text-[#15803D] dark:text-[#8BF0B0]" />
            <h3 className="font-display text-base font-semibold text-[#101216] dark:text-white">
              03. Safety & Review Authenticity Signals
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
              Screens listings for abnormal discount spikes, missing warranty terms, and unrecognized domains while summarizing real buyer durability feedback.
            </p>
            <button
              type="button"
              onClick={() => navigate('/url-analysis')}
              className="text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0] hover:underline cursor-pointer"
            >
              Verify a product URL →
            </button>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-[#101216] dark:text-white">
          {t.faqTitle}
        </h2>
        <div className="divide-y divide-black/[0.08] dark:divide-white/[0.08] rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08]">
          {[
            {
              q: 'Do affiliate links influence BuySmart Scores or product rankings?',
              a: 'Never. BuySmart Scores are computed strictly from performance, verified pricing, user fit, reliability, review sample quality, and warranty terms. Sponsored placements, when shown, are always labelled separately.',
            },
            {
              q: 'What happens when live merchant pricing or specs are unavailable?',
              a: 'BuySmart AI never fabricates discounts, ratings, or specs. Missing fields are displayed explicitly and lower the score confidence indicator.',
            },
            {
              q: 'Can I search and compare without creating an account?',
              a: 'Yes. Universal AI search, product comparisons, URL verification, and cart optimization work immediately without sign-in. Signing in with Google unlocks cross-device saved lists, price alerts, and history.',
            },
          ].map((item) => (
            <details key={item.q} className="group p-5">
              <summary className="flex items-center justify-between gap-4 font-display text-sm font-semibold text-[#101216] dark:text-white cursor-pointer list-none">
                <span>{item.q}</span>
                <ChevronDown className="w-4 h-4 text-[#4B5563] dark:text-[#A0A6B0] group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <p className="mt-3 text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <PriceAlertModal product={alertProduct} onClose={() => setAlertProduct(null)} />
    </main>
  );
};
