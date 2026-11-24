import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/i18n';
import type { Product } from '../shared/types';

interface PriceAlertModalProps {
  product: Product | null;
  onClose: () => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({ product, onClose }) => {
  const { currency, createPriceAlert } = useApp();
  const currentPrice = product?.offers[0]?.price ?? 0;
  const suggested = Math.max(100, Math.round(currentPrice * 0.9));
  const [targetPrice, setTargetPrice] = useState<string>(String(suggested));
  const [channel, setChannel] = useState<'in_app' | 'email'>('in_app');
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(targetPrice);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    setSubmitting(true);
    try {
      await createPriceAlert({ product, targetPrice: numeric, channel });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="alert-modal-title"
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.1] dark:border-white/[0.1] p-6 text-[#101216] dark:text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#15803D] dark:text-[#8BF0B0]" />
            <h2 id="alert-modal-title" className="font-display text-lg font-semibold">
              Set Price Drop Alert
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close price alert modal"
            className="p-1.5 rounded-lg text-[#4B5563] dark:text-[#A0A6B0] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-2 text-sm text-[#4B5563] dark:text-[#A0A6B0]">
          {product.title} · Current observed price:{' '}
          <span className="font-mono tabular-nums font-semibold text-[#101216] dark:text-white">
            {formatCurrency(currentPrice, currency, product.offers[0]?.currency)}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="target-price-input" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1.5">
              Target Price ({currency})
            </label>
            <input
              id="target-price-input"
              type="number"
              min={1}
              required
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] font-mono tabular-nums text-sm focus:outline-none focus:border-[#15803D] dark:focus:border-[#8BF0B0]"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1.5">
              Notification Channel
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('in_app')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border cursor-pointer ${
                  channel === 'in_app'
                    ? 'border-[#15803D] bg-[#15803D]/10 text-[#15803D] dark:border-[#8BF0B0] dark:bg-[#8BF0B0]/15 dark:text-[#8BF0B0]'
                    : 'border-black/[0.1] dark:border-white/[0.1]'
                }`}
              >
                In-App Notification
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border cursor-pointer ${
                  channel === 'email'
                    ? 'border-[#15803D] bg-[#15803D]/10 text-[#15803D] dark:border-[#8BF0B0] dark:bg-[#8BF0B0]/15 dark:text-[#8BF0B0]'
                    : 'border-black/[0.1] dark:border-white/[0.1]'
                }`}
              >
                Email Alert
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Create Alert'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};
