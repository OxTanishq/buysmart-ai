import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const HelpCentrePage: React.FC = () => (
  <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 pb-20 space-y-8">
    <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">Help Centre</h1>
    <div className="space-y-4">
      {[
        {
          title: 'How BuySmart Scores are calculated',
          body: 'By default, BuySmart weights Performance & Functionality (25%), Value for Money (25%), User Requirements Match (25%), Reliability Evidence (10%), Review Quality (10%), and Warranty & Support (5%). Missing evidence is never guessed and reduces the confidence level.',
        },
        {
          title: 'How live product research works',
          body: 'When you submit a query, BuySmart AI parses your budget, currency, and use case, searches verified catalog records and live Google Search grounding sources, deduplicates models, and displays source links with retrieval timestamps.',
        },
        {
          title: 'Does BuySmart AI purchase items automatically?',
          body: 'No. Every purchase is initiated and confirmed directly by you on the merchant storefront.',
        },
      ].map((card) => (
        <section
          key={card.title}
          className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-2"
        >
          <h2 className="font-display text-lg font-semibold text-[#101216] dark:text-white">{card.title}</h2>
          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">{card.body}</p>
        </section>
      ))}
    </div>
  </main>
);

export const ContactPage: React.FC = () => {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    showToast('Inquiry received by Nexora Studios support');
  };

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 pt-8 pb-20 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
        Contact Nexora Studios
      </h1>
      <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">
        Report product listing discrepancies, merchant integration inquiries, or feedback for BuySmart AI.
      </p>
      {sent ? (
        <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-[#15803D]/40 dark:border-[#8BF0B0]/40 text-sm text-[#101216] dark:text-white">
          Thank you, {name || 'shopper'}. Your message has been logged for our team.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4"
        >
          <div>
            <label htmlFor="contact-name" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1">Name</label>
            <input
              id="contact-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1">Email</label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
            />
          </div>
          <div>
            <label htmlFor="contact-msg" className="block text-xs font-medium text-[#4B5563] dark:text-[#A0A6B0] mb-1">Message</label>
            <textarea
              id="contact-msg"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
          >
            Send Message
          </button>
        </form>
      )}
    </main>
  );
};

export const PrivacyPolicyPage: React.FC = () => (
  <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 pb-20 space-y-5">
    <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">Privacy Policy</h1>
    <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4 text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
      <p>BuySmart AI, developed by Nexora Studios, respects user privacy and minimizes personal data collection.</p>
      <p>We never sell your private conversations, saved products, or search history to third parties. Uploaded product images for visual identification are processed in memory and discarded immediately.</p>
      <p>Authenticated users can export all saved data as JSON or delete their account permanently at any time under Privacy Settings.</p>
    </div>
  </main>
);

export const TermsPage: React.FC = () => (
  <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 pb-20 space-y-5">
    <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">Terms of Service</h1>
    <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4 text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
      <p>BuySmart AI provides independent shopping intelligence, price history observations, and AI-assisted research summaries for informational purposes.</p>
      <p>Prices, stock availability, and merchant warranty terms can change on external stores. Always verify final checkout terms directly on the merchant platform before purchasing.</p>
    </div>
  </main>
);

export const AffiliateDisclosurePage: React.FC = () => (
  <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 pb-20 space-y-5">
    <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">Affiliate & Monetisation Disclosure</h1>
    <div className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4 text-sm text-[#4B5563] dark:text-[#A0A6B0] leading-relaxed">
      <p>When you click through certain outbound merchant links on BuySmart AI, Nexora Studios may earn an affiliate referral commission at zero additional cost to you.</p>
      <p>Affiliate commissions never influence product rankings, BuySmart Scores, or AI recommendations. Any sponsored placement is explicitly labelled and separated from organic research.</p>
    </div>
  </main>
);
