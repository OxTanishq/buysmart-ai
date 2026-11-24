import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../context/AppContext';

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin, getIdToken, signInWithGoogle, showToast } = useApp();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState('oneplus-nord-ce4-5g');
  const [editPrice, setEditPrice] = useState('19999');
  const [editWarranty, setEditWarranty] = useState('1 Year Manufacturer Warranty');

  const fetchMetrics = async () => {
    setError(null);
    const token = await getIdToken();
    if (!token) {
      setError('Sign in with the verified administrator account to view metrics.');
      return;
    }
    const resp = await fetch('/api/admin/metrics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await resp.json();
    if (!resp.ok) {
      setError(json.error || 'Access denied');
      return;
    }
    setData(json);
  };

  useEffect(() => {
    if (user && isAdmin) {
      void fetchMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const handleCorrectRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getIdToken();
    if (!token) return;
    const resp = await fetch(`/api/admin/products/${encodeURIComponent(editId)}/correct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        price: Number(editPrice),
        warranty: editWarranty,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      showToast(json.error || 'Update failed');
      return;
    }
    showToast('Product record corrected and logged to audit history');
    void fetchMetrics();
  };

  if (!user || !isAdmin) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#101216] dark:text-white">
          Administration Console
        </h1>
        <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
          Restricted to verified BuySmart AI administrators.
        </p>
        {!user && (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
          >
            Sign in with Google
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
          BuySmart AI Administration
        </h1>
        <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0] mt-1">
          Signed in as {user.email}
        </p>
      </div>

      {error && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/25 text-sm text-red-500">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Searches', val: data.kpis.totalSearches },
              { label: 'Success Rate', val: `${data.kpis.searchSuccessRate}%` },
              { label: 'Failed Requests', val: data.kpis.failedRequests },
              { label: 'Catalog Records', val: data.kpis.catalogSize },
              { label: 'AI Calls', val: data.kpis.aiCallsCount },
              { label: 'Affiliate Clicks', val: data.kpis.affiliateClicks },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl p-4 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08]"
              >
                <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">{kpi.label}</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-[#101216] dark:text-white mt-1">
                  {kpi.val}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-7 rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#101216] dark:text-white">
                Popular Search Categories
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.popularCategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,166,176,0.2)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#A0A6B0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#A0A6B0' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171A20',
                        borderColor: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="count" fill="#8BF0B0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="lg:col-span-5 rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#101216] dark:text-white">
                Integration Status
              </h2>
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
                {data.integrations.map((intg: any) => (
                  <div key={intg.name} className="py-3 flex justify-between gap-4">
                    <span className="text-[#101216] dark:text-white font-medium">{intg.name}</span>
                    <span className="font-mono text-[#15803D] dark:text-[#8BF0B0]">{intg.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Correct Product Record Form + Audit Log */}
          <section className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-5">
            <h2 className="font-display text-lg font-semibold text-[#101216] dark:text-white">
              Correct Product Record (With Audit History)
            </h2>
            <form onSubmit={handleCorrectRecord} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs text-[#4B5563] dark:text-[#A0A6B0] mb-1">Product ID</label>
                <input
                  type="text"
                  value={editId}
                  onChange={(e) => setEditId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4B5563] dark:text-[#A0A6B0] mb-1">Verified Price (INR)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4B5563] dark:text-[#A0A6B0] mb-1">Warranty</label>
                <input
                  type="text"
                  value={editWarranty}
                  onChange={(e) => setEditWarranty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
              >
                Apply Correction
              </button>
            </form>

            {data.auditLogs?.length > 0 && (
              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2 text-xs">
                <div className="font-semibold text-[#101216] dark:text-white">Recent Audit Trail</div>
                {data.auditLogs.map((log: any) => (
                  <div key={log.id} className="font-mono text-[#4B5563] dark:text-[#A0A6B0]">
                    {log.timestamp} · {log.actorEmail} · {log.action} · {log.targetId}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};
