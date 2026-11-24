import React, { useEffect, useState } from 'react';
import { Bell, Trash2, TrendingDown } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/i18n';
import { PriceAlertModal } from '../components/PriceAlertModal';
import type { PricePoint, PriceStats, Product } from '../shared/types';

export const PriceTrackerPage: React.FC = () => {
  const { currency, priceAlerts, deletePriceAlert, navigate, theme } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('90d');
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [alertTarget, setAlertTarget] = useState<Product | null>(null);

  useEffect(() => {
    fetch('/api/deals')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.deals) && data.deals.length > 0) {
          setProducts(data.deals);
          setSelectedId(data.deals[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/products/${encodeURIComponent(selectedId)}/prices?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.history) setHistory(data.history);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, [selectedId, range]);

  const selectedProduct = products.find((p) => p.id === selectedId) ?? null;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
            Price History & Alerts
          </h1>
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
            Inspect verified price trajectories and configure target-price alerts without speculative guarantees.
          </p>
        </div>
      </div>

      {/* Interactive Chart Workspace */}
      <section className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="tracker-product-select" className="text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0]">
              Tracked Product:
            </label>
            <select
              id="tracker-product-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3.5 py-2 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <button
                type="button"
                onClick={() => setAlertTarget(selectedProduct)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Set Alert</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.06] dark:border-white/[0.06]">
            {(['7d', '30d', '90d', '1y', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-mono rounded-md cursor-pointer ${
                  range === r
                    ? 'bg-white dark:bg-[#171A20] text-[#101216] dark:text-white shadow-sm font-semibold'
                    : 'text-[#4B5563] dark:text-[#A0A6B0]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#101217]">
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Current Observed</div>
              <div className="font-mono tabular-nums text-xl font-bold text-[#101216] dark:text-white mt-1">
                {formatCurrency(stats.current, currency)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#101217]">
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Lowest Recorded</div>
              <div className="font-mono tabular-nums text-xl font-bold text-[#15803D] dark:text-[#8BF0B0] mt-1">
                {formatCurrency(stats.lowest, currency)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#101217]">
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Average Recorded</div>
              <div className="font-mono tabular-nums text-xl font-bold text-[#101216] dark:text-white mt-1">
                {formatCurrency(stats.average, currency)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#101217]">
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Highest Recorded</div>
              <div className="font-mono tabular-nums text-xl font-bold text-[#101216] dark:text-white mt-1">
                {formatCurrency(stats.highest, currency)}
              </div>
            </div>
          </div>
        )}

        {stats && (
          <div className="rounded-xl p-4 bg-[#F7F8FA] dark:bg-[#101217] flex items-start gap-3 text-sm">
            <TrendingDown className="w-4 h-4 text-[#15803D] dark:text-[#8BF0B0] mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-[#101216] dark:text-white">
                Purchasing Guidance: {stats.guidanceText}
              </div>
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0] mt-0.5">
                {stats.discountPattern} Future price reductions are never guaranteed.
              </div>
            </div>
          </div>
        )}

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
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
              <Line type="monotone" dataKey="price" stroke={theme === 'dark' ? '#8BF0B0' : '#15803D'} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Active Price Alerts */}
      <section className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
        <h2 className="font-display text-lg font-bold text-[#101216] dark:text-white">
          Your Active Price Alerts ({priceAlerts.length})
        </h2>

        {priceAlerts.length === 0 ? (
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
            No active price alerts configured yet. Click Set Alert above or on any product card to monitor target drops.
          </p>
        ) : (
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {priceAlerts.map((alert) => (
              <div key={alert.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => navigate(`/product/${alert.productId}`)}
                    className="font-display text-sm font-semibold text-[#101216] dark:text-white hover:underline cursor-pointer"
                  >
                    {alert.productTitle}
                  </button>
                  <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0] font-mono tabular-nums mt-0.5">
                    Target: {alert.targetPrice.toLocaleString('en-IN')} {alert.currency} · Current: {alert.currentPrice.toLocaleString('en-IN')} · Channel: {alert.channel} · Status: {alert.status}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deletePriceAlert(alert.id)}
                  aria-label={`Delete alert for ${alert.productTitle}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <PriceAlertModal product={alertTarget} onClose={() => setAlertTarget(null)} />
    </main>
  );
};
