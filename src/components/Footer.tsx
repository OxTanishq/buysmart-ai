import React from 'react';
import { Globe, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CurrencyCode, LanguageCode } from '../shared/types';

export const Footer: React.FC = () => {
  const { navigate, theme, toggleTheme, language, setLanguage, currency, setCurrency, isAdmin } =
    useApp();

  const linkClass =
    'text-sm text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white transition-colors text-left cursor-pointer';

  return (
    <footer className="border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#101217] mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-3">
            <div className="font-display text-lg font-bold text-[#101216] dark:text-white">
              BuySmart AI
            </div>
            <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
              Search smarter. Compare better. Buy confidently. Independent shopping intelligence built by Nexora Studios.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white">
                <Globe className="w-3.5 h-3.5 text-[#4B5563] dark:text-[#A0A6B0]" />
                <span className="sr-only">Language</span>
                <select
                  aria-label="Language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="en" className="bg-white dark:bg-[#171A20]">English</option>
                  <option value="hi" className="bg-white dark:bg-[#171A20]">हिन्दी</option>
                </select>
              </label>

              <label className="inline-flex items-center px-2.5 py-1.5 text-xs rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white">
                <span className="sr-only">Currency</span>
                <select
                  aria-label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="bg-transparent font-mono focus:outline-none cursor-pointer"
                >
                  <option value="INR" className="bg-white dark:bg-[#171A20]">INR (₹)</option>
                  <option value="USD" className="bg-white dark:bg-[#171A20]">USD ($)</option>
                  <option value="EUR" className="bg-white dark:bg-[#171A20]">EUR (€)</option>
                  <option value="GBP" className="bg-white dark:bg-[#171A20]">GBP (£)</option>
                </select>
              </label>
            </div>
          </div>

          <div className="space-y-2.5 flex flex-col">
            <h3 className="text-sm font-semibold text-[#101216] dark:text-white">Research Tools</h3>
            <button type="button" onClick={() => navigate('/search')} className={linkClass}>AI Shopping Search</button>
            <button type="button" onClick={() => navigate('/image-search')} className={linkClass}>Search by Image</button>
            <button type="button" onClick={() => navigate('/url-analysis')} className={linkClass}>Product URL Analyzer</button>
            <button type="button" onClick={() => navigate('/cart-optimizer')} className={linkClass}>Cart Optimizer</button>
            <button type="button" onClick={() => navigate('/assistant')} className={linkClass}>AI Conversations</button>
          </div>

          <div className="space-y-2.5 flex flex-col">
            <h3 className="text-sm font-semibold text-[#101216] dark:text-white">Account & Tracking</h3>
            <button type="button" onClick={() => navigate('/dashboard')} className={linkClass}>User Dashboard</button>
            <button type="button" onClick={() => navigate('/alerts')} className={linkClass}>Price Alerts</button>
            <button type="button" onClick={() => navigate('/history')} className={linkClass}>Search History</button>
            <button type="button" onClick={() => navigate('/settings')} className={linkClass}>Profile Settings</button>
            <button type="button" onClick={() => navigate('/privacy-settings')} className={linkClass}>Privacy & Data Export</button>
          </div>

          <div className="space-y-2.5 flex flex-col">
            <h3 className="text-sm font-semibold text-[#101216] dark:text-white">Trust & Legal</h3>
            <button type="button" onClick={() => navigate('/help')} className={linkClass}>Help Centre</button>
            <button type="button" onClick={() => navigate('/contact')} className={linkClass}>Contact Nexora Studios</button>
            <button type="button" onClick={() => navigate('/affiliate-disclosure')} className={linkClass}>Affiliate Disclosure</button>
            <button type="button" onClick={() => navigate('/privacy')} className={linkClass}>Privacy Policy</button>
            <button type="button" onClick={() => navigate('/terms')} className={linkClass}>Terms of Service</button>
            {isAdmin && (
              <button type="button" onClick={() => navigate('/admin')} className="text-sm font-medium text-[#15803D] dark:text-[#8BF0B0] text-left cursor-pointer">
                Administration Dashboard
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#4B5563] dark:text-[#A0A6B0]">
          <span>© {new Date().getFullYear()} BuySmart AI · Developed by Nexora Studios.</span>
          <span>Recommendations are independent and never ordered by affiliate commission.</span>
        </div>
      </div>
    </footer>
  );
};
