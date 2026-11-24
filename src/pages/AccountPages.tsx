import React, { useState } from 'react';
import { Bell, Bookmark, Download, History, LogIn, LogOut, Shield, Trash2, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/i18n';
import { AssistantPanel } from '../components/AssistantPanel';
import type { CurrencyCode, LanguageCode } from '../shared/types';

export const AuthPage: React.FC = () => {
  const { user, signInWithGoogle, signOutUser, navigate } = useApp();

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl p-8 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-[#101216] dark:text-white">
            {user ? 'Signed in to BuySmart AI' : 'Sign in to BuySmart AI'}
          </h1>
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
            Sync saved products, target price alerts, search history, and AI assistant sessions across devices.
          </p>
        </div>

        {user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#101217] text-sm">
              <div className="font-semibold text-[#101216] dark:text-white">{user.displayName}</div>
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">{user.email}</div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="py-2.5 px-4 text-sm font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] hover:opacity-90 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Continue with Google</span>
            </button>
            <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
              You can search and compare products anytime without registering. We collect only your name, email, and explicit shopping preferences.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export const SavedProductsPage: React.FC = () => {
  const { savedProducts, currency, navigate, user } = useApp();

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
            Saved Products ({savedProducts.length})
          </h1>
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
            {user ? 'Synced securely with your BuySmart AI account.' : 'Stored for this browser session. Sign in to sync across devices.'}
          </p>
        </div>
      </div>

      {savedProducts.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
          <Bookmark className="w-8 h-8 mx-auto text-[#4B5563] dark:text-[#A0A6B0]" />
          <h2 className="font-display text-lg font-semibold text-[#101216] dark:text-white">
            No saved products yet
          </h2>
          <button
            type="button"
            onClick={() => navigate('/search?q=smartphone')}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
          >
            Discover Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedProducts.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-4"
            >
              <div>
                <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                  {item.brand || 'Brand'} · {item.category || 'Product'}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/product/${item.productId}`)}
                  className="font-display text-base font-semibold text-[#101216] dark:text-white hover:underline text-left mt-1 cursor-pointer"
                >
                  {item.title}
                </button>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                <span className="font-mono tabular-nums font-bold text-[#101216] dark:text-white">
                  {formatCurrency(item.price, currency, (item.currency as CurrencyCode) || 'INR')}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/product/${item.productId}`)}
                  className="text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0] cursor-pointer"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export const SearchHistoryPage: React.FC = () => {
  const { searchHistory, navigate } = useApp();

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 pb-20 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
        Search History
      </h1>
      {searchHistory.length === 0 ? (
        <div className="rounded-2xl p-10 text-center bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-3">
          <History className="w-8 h-8 mx-auto text-[#4B5563] dark:text-[#A0A6B0]" />
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
            Your recent shopping queries will appear here as you research products.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {searchHistory.map((item) => (
            <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-medium text-sm text-[#101216] dark:text-white">{item.query}</div>
                <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0] font-mono">
                  {item.category || 'All categories'} · {item.resultCount ?? 0} results
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-black/[0.1] dark:border-white/[0.1] cursor-pointer"
              >
                Re-run Search
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export const ConversationsPage: React.FC = () => {
  const { conversations } = useApp();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
          Personal AI Shopping Assistant
        </h1>
        <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
          Continue your conversational research or start a new session below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-[#101216] dark:text-white">
            Saved Conversations ({conversations.length})
          </h2>
          {conversations.length === 0 ? (
            <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] text-sm text-[#4B5563] dark:text-[#A0A6B0]">
              Click Save inside the AI assistant to keep conversations across sessions.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="rounded-2xl p-4 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-2"
              >
                <div className="font-semibold text-sm text-[#101216] dark:text-white">{conv.title}</div>
                <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                  {conv.messages.length} messages
                </div>
              </div>
            ))
          )}
        </div>
        <div className="lg:col-span-7">
          <AssistantPanel
            contextSummary="General multi-category personal shopping assistant."
            sessionTitle="Personal Assistant Session"
          />
        </div>
      </div>
    </main>
  );
};

export const UserDashboardPage: React.FC = () => {
  const {
    user,
    isAdmin,
    signOutUser,
    navigate,
    savedProducts,
    priceAlerts,
    searchHistory,
    notifications,
    markNotificationRead,
  } = useApp();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <User className="w-8 h-8 text-[#15803D] dark:text-[#8BF0B0]" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#101216] dark:text-white">
              {user ? `Welcome, ${user.displayName}` : 'Shopping Dashboard'}
            </h1>
            <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
              {user ? user.email : 'Sign in to sync saved items, price alerts, and preferences.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
            >
              Admin Console
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] cursor-pointer"
          >
            Profile Settings
          </button>
          <button
            type="button"
            onClick={() => navigate('/privacy-settings')}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] cursor-pointer"
          >
            Privacy & Export
          </button>
          {user && (
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => navigate('/saved')}
          className="text-left rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] cursor-pointer"
        >
          <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Saved Products</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[#101216] dark:text-white mt-1">
            {savedProducts.length}
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/alerts')}
          className="text-left rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] cursor-pointer"
        >
          <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Active Price Alerts</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[#15803D] dark:text-[#8BF0B0] mt-1">
            {priceAlerts.length}
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="text-left rounded-2xl p-5 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] cursor-pointer"
        >
          <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Recent Searches</div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[#101216] dark:text-white mt-1">
            {searchHistory.length}
          </div>
        </button>
      </div>

      <section className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2 font-display text-base font-semibold text-[#101216] dark:text-white">
          <Bell className="w-4 h-4 text-[#15803D] dark:text-[#8BF0B0]" />
          <span>Notifications</span>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
            No notifications yet. Price alert triggers and updates will appear here.
          </p>
        ) : (
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {notifications.map((n) => (
              <div key={n.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium text-[#101216] dark:text-white">{n.title}</div>
                  <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">{n.body}</div>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => void markNotificationRead(n.id)}
                    className="text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0] cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export const SettingsPage: React.FC = () => {
  const { currency, language, saveUserPreferences } = useApp();
  const [prefCurrency, setPrefCurrency] = useState<CurrencyCode>(currency);
  const [prefLang, setPrefLang] = useState<LanguageCode>(language);
  const [country, setCountry] = useState('India');
  const [defaultBudget, setDefaultBudget] = useState('25000');

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
        Profile & Shopping Preferences
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void saveUserPreferences({
            preferredCurrency: prefCurrency,
            preferredLanguage: prefLang,
            country,
            defaultBudget: Number(defaultBudget) || 0,
          });
        }}
        className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4"
      >
        <div>
          <label className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1">
            Preferred Currency
          </label>
          <select
            value={prefCurrency}
            onChange={(e) => setPrefCurrency(e.target.value as CurrencyCode)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
          >
            <option value="INR">Indian Rupee (INR ₹)</option>
            <option value="USD">US Dollar (USD $)</option>
            <option value="EUR">Euro (EUR €)</option>
            <option value="GBP">British Pound (GBP £)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1">
            Language
          </label>
          <select
            value={prefLang}
            onChange={(e) => setPrefLang(e.target.value as LanguageCode)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिन्दी)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1">
            Region / Country
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1">
            Default Target Budget
          </label>
          <input
            type="number"
            value={defaultBudget}
            onChange={(e) => setDefaultBudget(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
          />
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
        >
          Save Preferences
        </button>
      </form>
    </main>
  );
};

export const PrivacySettingsPage: React.FC = () => {
  const { user, exportPersonalData, deleteAccountData } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-[#15803D] dark:text-[#8BF0B0]" />
        <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
          Privacy, Data Export & Account Controls
        </h1>
      </div>

      <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
        <h2 className="font-display text-base font-semibold text-[#101216] dark:text-white">
          Export Your Data
        </h2>
        <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
          Download a portable JSON copy of your preferences, saved products, price alerts, search history, and saved AI conversations.
        </p>
        <button
          type="button"
          onClick={() => void exportPersonalData()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Personal Data (JSON)</span>
        </button>
      </div>

      {user && (
        <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-red-500/25 space-y-4">
          <h2 className="font-display text-base font-semibold text-red-600 dark:text-red-400">
            Delete Account & Saved Records
          </h2>
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
            Permanently deletes your BuySmart AI profile, saved products, price alerts, and search history.
          </p>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Request Account Deletion</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void deleteAccountData()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white cursor-pointer"
              >
                Confirm Permanent Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm rounded-lg border border-black/[0.1] dark:border-white/[0.1] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
};
