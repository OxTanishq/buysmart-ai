import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/i18n';
import type { CategoryInfo } from '../shared/types';

export const CategoriesPage: React.FC = () => {
  const { navigate, language, currency } = useApp();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categories)) setCategories(data.categories);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
          Shopping Categories
        </h1>
        <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
          Explore category-specific scoring profiles across electronics, home, fashion, education, and gifts.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-white dark:bg-[#171A20] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/search?category=${cat.id}`)}
              className="text-left rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#15803D] dark:hover:border-[#8BF0B0] transition-colors flex flex-col justify-between gap-4 cursor-pointer"
            >
              <div>
                <h2 className="font-display text-lg font-semibold text-[#101216] dark:text-white">
                  {language === 'hi' ? cat.nameHi : cat.name}
                </h2>
                <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">{cat.description}</p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <span className="font-mono text-[#4B5563] dark:text-[#A0A6B0]">
                  Typical starting budget: {formatCurrency(cat.sampleBudgetINR, currency)}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#15803D] dark:text-[#8BF0B0]">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
};
