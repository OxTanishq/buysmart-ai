import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { ComparePage } from './pages/ComparePage';
import { PriceTrackerPage } from './pages/PriceTrackerPage';
import { CartOptimizerPage } from './pages/CartOptimizerPage';
import { ImageSearchPage } from './pages/ImageSearchPage';
import { UrlAnalysisPage } from './pages/UrlAnalysisPage';
import { CategoriesPage } from './pages/CategoriesPage';
import {
  AuthPage,
  ConversationsPage,
  PrivacySettingsPage,
  SavedProductsPage,
  SearchHistoryPage,
  SettingsPage,
  UserDashboardPage,
} from './pages/AccountPages';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import {
  AffiliateDisclosurePage,
  ContactPage,
  HelpCentrePage,
  PrivacyPolicyPage,
  TermsPage,
} from './pages/LegalAndSupportPages';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#08090B] text-white">
          <div className="max-w-md rounded-2xl p-6 bg-[#171A20] border border-white/10 space-y-3">
            <h1 className="font-display text-lg font-bold">Something went wrong</h1>
            <p className="text-xs text-[#A0A6B0]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#8BF0B0] text-[#08090B]"
            >
              Reload BuySmart AI
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const RouterView: React.FC = () => {
  const { route, toast } = useApp();
  const path = route.split('?')[0].replace(/\/+$/, '') || '/';

  let page: React.ReactNode;
  if (path === '/') page = <HomePage />;
  else if (path === '/search') page = <SearchResultsPage />;
  else if (path.startsWith('/product/')) {
    const id = decodeURIComponent(path.slice('/product/'.length));
    page = <ProductDetailsPage productId={id} />;
  } else if (path === '/compare') page = <ComparePage />;
  else if (path === '/price-tracker' || path === '/alerts') page = <PriceTrackerPage />;
  else if (path === '/cart-optimizer') page = <CartOptimizerPage />;
  else if (path === '/image-search') page = <ImageSearchPage />;
  else if (path === '/url-analysis') page = <UrlAnalysisPage />;
  else if (path === '/categories') page = <CategoriesPage />;
  else if (path === '/saved') page = <SavedProductsPage />;
  else if (path === '/history') page = <SearchHistoryPage />;
  else if (path === '/assistant') page = <ConversationsPage />;
  else if (path === '/dashboard') page = <UserDashboardPage />;
  else if (path === '/settings') page = <SettingsPage />;
  else if (path === '/privacy-settings') page = <PrivacySettingsPage />;
  else if (path === '/auth') page = <AuthPage />;
  else if (path === '/admin') page = <AdminDashboardPage />;
  else if (path === '/help') page = <HelpCentrePage />;
  else if (path === '/contact') page = <ContactPage />;
  else if (path === '/privacy') page = <PrivacyPolicyPage />;
  else if (path === '/terms') page = <TermsPage />;
  else if (path === '/affiliate-disclosure') page = <AffiliateDisclosurePage />;
  else page = <HomePage />;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#101216] dark:bg-[#08090B] dark:text-white transition-colors duration-200">
      <Navbar />
      <div className="flex-1">{page}</div>
      <Footer />
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#101216] dark:bg-white text-white dark:text-[#101216] text-xs font-medium shadow-xl border border-white/10"
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <RouterView />
      </AppProvider>
    </AppErrorBoundary>
  );
}
