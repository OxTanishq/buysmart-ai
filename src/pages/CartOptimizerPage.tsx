import React, { useEffect, useState } from 'react';
import { AlertCircle, BookmarkPlus, CheckCircle2, Layers } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/i18n';
import type { CartOptimizationResult } from '../shared/types';

export const CartOptimizerPage: React.FC = () => {
  const { currency, navigate, user, showToast } = useApp();

  const [goal, setGoal] = useState('Build a complete gaming setup under ₹80,000');
  const [budget, setBudget] = useState('80000');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CartOptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runOptimization = async (customGoal = goal, customBudget = Number(budget), customOverrides = overrides) => {
    setLoading(true);
    try {
      const resp = await fetch('/api/cart/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: customGoal,
          budget: customBudget > 0 ? customBudget : 80000,
          currency,
          overrides: customOverrides,
        }),
      });
      const data = await resp.json();
      if (resp.ok) setResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runOptimization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const recalculatedTotal = (result?.items ?? []).reduce((acc, item) => {
    const qty = quantities[item.slot] ?? item.quantity;
    return acc + item.estimatedTotal * qty;
  }, 0);

  const saveShoppingList = async () => {
    if (!result) return;
    if (!user) {
      showToast('Sign in to save shopping lists to your account');
      return;
    }
    const docId = `list_${user.uid}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'shopping_lists', docId), {
        userId: user.uid,
        title: result.goal.slice(0, 180),
        budget: result.totalBudget,
        currency,
        items: result.items.map((i) => ({
          slot: i.slot,
          productId: i.product.id,
          title: i.product.title,
          quantity: quantities[i.slot] ?? i.quantity,
          estimatedTotal: i.estimatedTotal,
        })),
        totalEstimatedCost: recalculatedTotal,
        isPublic: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('Shopping list saved');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `shopping_lists/${docId}`);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
          AI Shopping Cart Optimizer
        </h1>
        <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
          Allocate a multi-product budget across compatible components, compare merchants, and recalculate totals live.
        </p>
      </div>

      {/* Goal & Budget Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runOptimization();
        }}
        className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
      >
        <div className="md:col-span-6">
          <label htmlFor="cart-goal" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1.5">
            Setup or Shopping Goal
          </label>
          <input
            id="cart-goal"
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white"
          />
        </div>
        <div className="md:col-span-3">
          <label htmlFor="cart-budget" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1.5">
            Total Budget ({currency})
          </label>
          <input
            id="cart-budget"
            type="number"
            min={1000}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white"
          />
        </div>
        <div className="md:col-span-3 flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
          >
            {loading ? 'Optimizing...' : 'Optimize Plan'}
          </button>
        </div>

        <div className="md:col-span-12 flex flex-wrap gap-2 pt-1">
          {[
            { g: 'Build a complete gaming setup under ₹80,000', b: '80000' },
            { g: 'Student coding & remote desk setup under ₹65,000', b: '65000' },
          ].map((preset) => (
            <button
              key={preset.g}
              type="button"
              onClick={() => {
                setGoal(preset.g);
                setBudget(preset.b);
                setOverrides({});
                setQuantities({});
                void runOptimization(preset.g, Number(preset.b), {});
              }}
              className="px-3 py-1 text-xs rounded-md bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.08] dark:border-white/[0.08] text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white cursor-pointer"
            >
              {preset.g}
            </button>
          ))}
        </div>
      </form>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Allocated Items */}
          <section className="lg:col-span-8 space-y-4">
            {result.items.map((item) => {
              const qty = quantities[item.slot] ?? item.quantity;
              return (
                <div
                  key={item.slot}
                  className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-[#15803D] dark:text-[#8BF0B0]">
                        {item.category} · Target Allocation {formatCurrency(item.allocatedBudget, currency)}
                      </div>
                      <h2 className="font-display text-base font-bold text-[#101216] dark:text-white mt-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${item.product.id}`)}
                          className="hover:underline text-left cursor-pointer"
                        >
                          {item.product.title}
                        </button>
                      </h2>
                      <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0] mt-0.5">
                        {item.product.offers[0]?.merchant} · BuySmart Score {item.product.score.total}/100
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                        Qty:
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={qty}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [item.slot]: Math.max(0, Number(e.target.value)),
                            }))
                          }
                          className="ml-1.5 w-14 px-2 py-1 text-xs font-mono rounded border border-black/[0.1] dark:border-white/[0.1] bg-[#F7F8FA] dark:bg-[#101217] text-[#101216] dark:text-white"
                        />
                      </label>

                      <div className="font-mono tabular-nums text-lg font-bold text-[#101216] dark:text-white">
                        {formatCurrency(item.estimatedTotal * qty, currency, item.product.offers[0]?.currency)}
                      </div>
                    </div>
                  </div>

                  {item.alternatives.length > 0 && (
                    <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[#4B5563] dark:text-[#A0A6B0]">Swap alternative:</span>
                      {item.alternatives.map((alt) => (
                        <button
                          key={alt.id}
                          type="button"
                          onClick={() => {
                            const next = { ...overrides, [item.slot]: alt.id };
                            setOverrides(next);
                            void runOptimization(goal, Number(budget), next);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#15803D] dark:hover:border-[#8BF0B0] cursor-pointer"
                        >
                          {alt.title} ({formatCurrency(alt.offers[0]?.totalCost ?? 0, currency)})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Summary & Compatibility Sidebar */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 font-display text-base font-bold text-[#101216] dark:text-white">
                <Layers className="w-4 h-4 text-[#15803D] dark:text-[#8BF0B0]" />
                <span>Estimated Total</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#A0A6B0]">Target Budget</span>
                  <span className="font-mono tabular-nums text-[#101216] dark:text-white">
                    {formatCurrency(result.totalBudget, currency, result.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#A0A6B0]">Shipping</span>
                  <span className="font-mono tabular-nums text-[#15803D] dark:text-[#8BF0B0]">Free</span>
                </div>
                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex justify-between text-base font-bold">
                  <span className="text-[#101216] dark:text-white">Estimated Grand Total</span>
                  <span className="font-mono tabular-nums text-[#101216] dark:text-white">
                    {formatCurrency(recalculatedTotal, currency)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void saveShoppingList()}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Save Shopping List</span>
              </button>
            </div>

            <div className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3 text-xs">
              <div className="font-display text-sm font-semibold text-[#101216] dark:text-white">
                Compatibility & Savings Notes
              </div>
              {result.compatibilityNotes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 text-[#15803D] dark:text-[#8BF0B0]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
              {result.warnings.map((warn, i) => (
                <div key={i} className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
              {result.unnecessarySavingsTip && (
                <p className="text-[#4B5563] dark:text-[#A0A6B0] pt-1">
                  {result.unnecessarySavingsTip}
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
};
