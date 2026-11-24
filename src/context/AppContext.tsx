import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  deleteUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleAuthProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { TRANSLATIONS } from '../lib/i18n';
import type { CurrencyCode, LanguageCode, Product, ScoreWeights } from '../shared/types';

export interface SavedProductDoc {
  id: string;
  userId: string;
  productId: string;
  title: string;
  brand?: string;
  category?: string;
  price: number;
  currency: string;
  buySmartScore?: number;
  sourceUrl?: string;
  imageUrl?: string;
}

export interface PriceAlertDoc {
  id: string;
  userId: string;
  productId: string;
  productTitle: string;
  currentPrice: number;
  targetPrice: number;
  currency: string;
  channel: 'in_app' | 'email';
  status: 'active' | 'triggered' | 'paused';
}

export interface SearchHistoryDoc {
  id: string;
  query: string;
  category?: string;
  budget?: number;
  currency?: string;
  resultCount?: number;
  createdAt?: string;
}

export interface NotificationDoc {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: string;
}

export interface ConversationDoc {
  id: string;
  title: string;
  messages: Array<{ role: 'user' | 'model'; text: string; timestamp: string }>;
}

interface AppContextValue {
  route: string;
  navigate: (to: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currency: CurrencyCode;
  setCurrency: (curr: CurrencyCode) => void;
  t: (typeof TRANSLATIONS)['en'] | (typeof TRANSLATIONS)['hi'];
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  compareIds: string[];
  compareProductsCache: Record<string, Product>;
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;
  savedProducts: SavedProductDoc[];
  toggleSaveProduct: (product: Product) => Promise<void>;
  isProductSaved: (productId: string) => boolean;
  priceAlerts: PriceAlertDoc[];
  createPriceAlert: (params: {
    product: Product;
    targetPrice: number;
    channel: 'in_app' | 'email';
  }) => Promise<void>;
  deletePriceAlert: (alertId: string) => Promise<void>;
  searchHistory: SearchHistoryDoc[];
  recordSearchHistory: (item: Omit<SearchHistoryDoc, 'id'>) => Promise<void>;
  notifications: NotificationDoc[];
  markNotificationRead: (id: string) => Promise<void>;
  conversations: ConversationDoc[];
  saveConversation: (title: string, messages: ConversationDoc['messages']) => Promise<void>;
  priorityWeights: ScoreWeights;
  setPriorityWeights: (w: ScoreWeights) => void;
  saveUserPreferences: (prefs: {
    preferredCurrency: CurrencyCode;
    preferredLanguage: LanguageCode;
    country: string;
    defaultBudget: number;
  }) => Promise<void>;
  exportPersonalData: () => Promise<void>;
  deleteAccountData: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_WEIGHTS: ScoreWeights = {
  performance: 0.25,
  value: 0.25,
  requirementsMatch: 0.25,
  reliability: 0.1,
  reviewQuality: 0.1,
  warrantySupport: 0.05,
};

function sanitizeDocId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'doc_item';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<string>(
    () => window.location.pathname + window.location.search,
  );
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [compareIds, setCompareIds] = useState<string[]>([
    'oneplus-nord-ce4-5g',
    'moto-edge-50-fusion',
  ]);
  const [compareProductsCache, setCompareProductsCache] = useState<Record<string, Product>>({});

  const [savedProducts, setSavedProducts] = useState<SavedProductDoc[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertDoc[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [conversations, setConversations] = useState<ConversationDoc[]>([]);
  const [priorityWeights, setPriorityWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handlePop = () => setRoute(window.location.pathname + window.location.search);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (window.location.pathname + window.location.search !== to) {
      window.history.pushState({}, '', to);
      setRoute(to);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Firebase Auth listener + profile sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(
            userRef,
            {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'BuySmart Shopper',
              photoUrl: firebaseUser.photoURL || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch {
          // Ignore merge error if createdAt immutable check hits on existing profile; update instead
          try {
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              displayName: firebaseUser.displayName || 'BuySmart Shopper',
              photoUrl: firebaseUser.photoURL || '',
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Best-effort sync
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time subscriptions strictly when authenticated
  useEffect(() => {
    if (!authReady || !user) {
      return;
    }

    const uid = user.uid;

    const unsubSaved = onSnapshot(
      query(collection(db, 'saved_products'), where('userId', '==', uid)),
      (snap) => {
        setSavedProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'saved_products'),
    );

    const unsubAlerts = onSnapshot(
      query(collection(db, 'price_alerts'), where('userId', '==', uid)),
      (snap) => {
        setPriceAlerts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'price_alerts'),
    );

    const unsubHistory = onSnapshot(
      query(collection(db, 'search_history'), where('userId', '==', uid)),
      (snap) => {
        setSearchHistory(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'search_history'),
    );

    const unsubNotif = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      (snap) => {
        setNotifications(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'),
    );

    const unsubConv = onSnapshot(
      query(collection(db, 'conversations'), where('userId', '==', uid)),
      (snap) => {
        setConversations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations'),
    );

    return () => {
      unsubSaved();
      unsubAlerts();
      unsubHistory();
      unsubNotif();
      unsubConv();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      showToast('Signed in successfully');
    } catch (err: any) {
      showToast(err?.message || 'Sign-in cancelled or blocked');
    }
  }, [showToast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setSavedProducts([]);
    setPriceAlerts([]);
    setSearchHistory([]);
    setNotifications([]);
    setConversations([]);
    showToast('Signed out');
  }, [showToast]);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const toggleCompare = useCallback(
    (product: Product) => {
      setCompareProductsCache((prev) => ({ ...prev, [product.id]: product }));
      setCompareIds((prev) => {
        if (prev.includes(product.id)) {
          return prev.filter((id) => id !== product.id);
        }
        if (prev.length >= 6) {
          showToast('Comparison holds up to 6 products at once');
          return prev;
        }
        showToast(`Added ${product.title} to comparison`);
        return [...prev, product.id];
      });
    },
    [showToast],
  );

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const isProductSaved = useCallback(
    (productId: string) => savedProducts.some((s) => s.productId === productId),
    [savedProducts],
  );

  const toggleSaveProduct = useCallback(
    async (product: Product) => {
      const existing = savedProducts.find((s) => s.productId === product.id);
      if (!user) {
        // Local session bookmark for unauthenticated visitors
        if (existing) {
          setSavedProducts((prev) => prev.filter((s) => s.productId !== product.id));
          showToast('Removed from saved items');
        } else {
          setSavedProducts((prev) => [
            ...prev,
            {
              id: `local_${product.id}`,
              userId: 'guest',
              productId: product.id,
              title: product.title,
              brand: product.brand,
              category: product.category,
              price: product.offers[0]?.price ?? 0,
              currency: product.offers[0]?.currency ?? 'INR',
              buySmartScore: product.score.total,
              sourceUrl: product.offers[0]?.url ?? '',
              imageUrl: product.imageUrl,
            },
          ]);
          showToast('Saved for this session (Sign in to sync across devices)');
        }
        return;
      }

      const docId = sanitizeDocId(`${user.uid}_${product.id}`);
      const ref = doc(db, 'saved_products', docId);
      try {
        if (existing) {
          await deleteDoc(ref);
          showToast('Removed from saved products');
        } else {
          await setDoc(ref, {
            userId: user.uid,
            productId: sanitizeDocId(product.id),
            title: product.title.slice(0, 240),
            brand: product.brand.slice(0, 80),
            category: product.category.slice(0, 80),
            price: product.offers[0]?.price ?? 0,
            currency: product.offers[0]?.currency ?? 'INR',
            buySmartScore: product.score.total,
            sourceUrl: (product.offers[0]?.url ?? '').slice(0, 512),
            imageUrl: (product.imageUrl ?? '').slice(0, 512),
            createdAt: serverTimestamp(),
          });
          showToast('Saved to your account');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `saved_products/${docId}`);
      }
    },
    [savedProducts, user, showToast],
  );

  const createPriceAlert = useCallback(
    async ({
      product,
      targetPrice,
      channel,
    }: {
      product: Product;
      targetPrice: number;
      channel: 'in_app' | 'email';
    }) => {
      if (targetPrice <= 0) {
        showToast('Enter a valid target price');
        return;
      }
      if (!user) {
        const localAlert: PriceAlertDoc = {
          id: `local_alert_${Date.now()}`,
          userId: 'guest',
          productId: product.id,
          productTitle: product.title,
          currentPrice: product.offers[0]?.price ?? 0,
          targetPrice,
          currency,
          channel,
          status: 'active',
        };
        setPriceAlerts((prev) => [localAlert, ...prev]);
        showToast('Alert active for this session (Sign in for persistent tracking)');
        return;
      }

      const docId = sanitizeDocId(`${user.uid}_${product.id}_${Date.now()}`);
      try {
        await setDoc(doc(db, 'price_alerts', docId), {
          userId: user.uid,
          productId: sanitizeDocId(product.id),
          productTitle: product.title.slice(0, 240),
          currentPrice: product.offers[0]?.price ?? 0,
          targetPrice,
          currency,
          channel,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'notifications', sanitizeDocId(`notif_${Date.now()}`)), {
          userId: user.uid,
          title: 'Price alert created',
          body: `Tracking ${product.title} for target ${targetPrice.toLocaleString('en-IN')} ${currency}.`,
          read: false,
          createdAt: serverTimestamp(),
        });
        showToast('Price alert configured');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `price_alerts/${docId}`);
      }
    },
    [user, currency, showToast],
  );

  const deletePriceAlert = useCallback(
    async (alertId: string) => {
      if (!user) {
        setPriceAlerts((prev) => prev.filter((a) => a.id !== alertId));
        showToast('Alert removed');
        return;
      }
      try {
        await deleteDoc(doc(db, 'price_alerts', alertId));
        showToast('Alert removed');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `price_alerts/${alertId}`);
      }
    },
    [user, showToast],
  );

  const recordSearchHistory = useCallback(
    async (item: Omit<SearchHistoryDoc, 'id'>) => {
      const localId = `hist_${Date.now()}`;
      if (!user) {
        setSearchHistory((prev) => [{ id: localId, ...item, createdAt: new Date().toISOString() }, ...prev].slice(0, 20));
        return;
      }
      const docId = sanitizeDocId(`${user.uid}_${Date.now()}`);
      try {
        await setDoc(doc(db, 'search_history', docId), {
          userId: user.uid,
          query: item.query.slice(0, 400),
          category: (item.category || '').slice(0, 80),
          budget: item.budget ?? 0,
          currency: item.currency || currency,
          resultCount: item.resultCount ?? 0,
          createdAt: serverTimestamp(),
        });
      } catch {
        // Non-blocking history logging
      }
    },
    [user, currency],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        await updateDoc(doc(db, 'notifications', id), { read: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
      }
    },
    [user],
  );

  const saveConversation = useCallback(
    async (title: string, messages: ConversationDoc['messages']) => {
      if (!user) {
        setConversations((prev) => [{ id: `conv_${Date.now()}`, title, messages }, ...prev].slice(0, 10));
        return;
      }
      const docId = sanitizeDocId(`${user.uid}_conv_${Date.now()}`);
      try {
        await setDoc(doc(db, 'conversations', docId), {
          userId: user.uid,
          title: title.slice(0, 180),
          messages: messages.slice(-50),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('Conversation saved');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `conversations/${docId}`);
      }
    },
    [user, showToast],
  );

  const saveUserPreferences = useCallback(
    async (prefs: {
      preferredCurrency: CurrencyCode;
      preferredLanguage: LanguageCode;
      country: string;
      defaultBudget: number;
    }) => {
      setCurrency(prefs.preferredCurrency);
      setLanguage(prefs.preferredLanguage);
      if (!user) {
        showToast('Preferences updated for this session');
        return;
      }
      try {
        await setDoc(doc(db, 'users', user.uid, 'private', 'preferences'), {
          userId: user.uid,
          email: user.email || '',
          preferredCurrency: prefs.preferredCurrency,
          preferredLanguage: prefs.preferredLanguage,
          country: prefs.country,
          defaultBudget: prefs.defaultBudget,
          priorityWeights,
          updatedAt: serverTimestamp(),
        });
        showToast('Preferences saved to your profile');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/private/preferences`);
      }
    },
    [user, priorityWeights, showToast],
  );

  const exportPersonalData = useCallback(async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: user ? { uid: user.uid, displayName: user.displayName, email: user.email } : 'guest',
      preferences: { currency, language, priorityWeights },
      savedProducts,
      priceAlerts,
      searchHistory,
      conversations,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buysmart-ai-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Personal data exported as JSON');
  }, [user, currency, language, priorityWeights, savedProducts, priceAlerts, searchHistory, conversations, showToast]);

  const deleteAccountData = useCallback(async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const collections = ['saved_products', 'price_alerts', 'search_history', 'notifications', 'conversations'];
      for (const col of collections) {
        const snap = await getDocs(query(collection(db, col), where('userId', '==', user.uid)));
        snap.docs.forEach((d) => batch.delete(d.ref));
      }
      batch.delete(doc(db, 'users', user.uid, 'private', 'preferences'));
      batch.delete(doc(db, 'users', user.uid));
      await batch.commit();
      await deleteUser(user);
      showToast('Account and saved personal records deleted');
      navigate('/');
    } catch (err: any) {
      showToast(err?.message || 'Re-authenticate recently to delete your account.');
    }
  }, [user, showToast, navigate]);

  const isAdmin = Boolean(user?.email === 'rajuoptif@gmail.com' && user.emailVerified);
  const t = TRANSLATIONS[language];

  return (
    <AppContext.Provider
      value={{
        route,
        navigate,
        theme,
        toggleTheme,
        language,
        setLanguage,
        currency,
        setCurrency,
        t,
        user,
        authReady,
        isAdmin,
        signInWithGoogle,
        signOutUser,
        getIdToken,
        compareIds,
        compareProductsCache,
        toggleCompare,
        clearCompare,
        savedProducts,
        toggleSaveProduct,
        isProductSaved,
        priceAlerts,
        createPriceAlert,
        deletePriceAlert,
        searchHistory,
        recordSearchHistory,
        notifications,
        markNotificationRead,
        conversations,
        saveConversation,
        priorityWeights,
        setPriorityWeights,
        saveUserPreferences,
        exportPersonalData,
        deleteAccountData,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
