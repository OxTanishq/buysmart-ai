import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const { route, navigate, t, user, compareIds, savedProducts } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const path = route.split('?')[0];

  const navItems = [
    { label: t.navExplore, href: '/categories' },
    { label: `${t.navCompare}${compareIds.length > 0 ? ` (${compareIds.length})` : ''}`, href: '/compare' },
    { label: t.navPriceTracker, href: '/price-tracker' },
    { label: t.navCartOptimizer, href: '/cart-optimizer' },
    { label: `${t.navSaved}${savedProducts.length > 0 ? ` (${savedProducts.length})` : ''}`, href: '/saved' },
  ];

  const handleLink = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    navigate(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-[#08090B]/85 border-b border-black/[0.08] dark:border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => handleLink(e, '/')}
          className="font-display text-lg font-bold tracking-tight text-[#101216] dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#15803D] dark:focus-visible:outline-[#8BF0B0] rounded"
        >
          BuySmart AI
        </a>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = path === item.href || (item.href === '/categories' && path === '/search');
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleLink(e, item.href)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  active
                    ? 'text-[#15803D] dark:text-[#8BF0B0] underline underline-offset-8 decoration-2'
                    : 'text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action + mobile drawer trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user.displayName?.split(' ')[0] || 'Account'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.signIn}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden p-2 rounded-lg text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white border border-black/[0.08] dark:border-white/[0.08]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile collapsible menu */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#101217] px-4 py-3 flex flex-col gap-1"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleLink(e, item.href)}
              className="py-2.5 px-2 text-sm font-medium text-[#101216] dark:text-white rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            >
              {item.label}
            </a>
          ))}
          <a
            href="/image-search"
            onClick={(e) => handleLink(e, '/image-search')}
            className="py-2.5 px-2 text-sm font-medium text-[#4B5563] dark:text-[#A0A6B0] rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
          >
            Image Search
          </a>
          <a
            href="/url-analysis"
            onClick={(e) => handleLink(e, '/url-analysis')}
            className="py-2.5 px-2 text-sm font-medium text-[#4B5563] dark:text-[#A0A6B0] rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
          >
            URL Analysis
          </a>
        </nav>
      )}
    </header>
  );
};
