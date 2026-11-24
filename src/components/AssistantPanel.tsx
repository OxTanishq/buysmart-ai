import React, { useState } from 'react';
import { BookmarkPlus, MessageSquare, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface AssistantPanelProps {
  contextSummary: string;
  sessionTitle?: string;
}

const QUICK_PROMPTS = [
  'Why is the top pick better?',
  'Can you find a cheaper alternative?',
  'Which option will last longer?',
  'Explain these specs in simple words.',
];

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  contextSummary,
  sessionTitle = 'Shopping Research Session',
}) => {
  const { language, currency, t, saveConversation } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text:
        language === 'hi'
          ? 'नमस्ते! मैं BuySmart AI असिस्टेंट हूँ। आप उत्पाद तुलना, सस्ते विकल्प या स्पेसिफिकेशन के बारे में कोई भी प्रश्न पूछ सकते हैं।'
          : 'Ask me about trade-offs, cheaper alternatives, longevity, or technical specs in plain language.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const userMsg: Message = {
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages([...nextHistory, { role: 'model', text: '', timestamp: new Date().toISOString() }]);
    setInput('');
    setStreaming(true);

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          contextSummary,
          language,
          currency,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Assistant unavailable right now.');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('Streaming not supported');
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        for (const line of chunkStr.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.error) throw new Error(payload.error);
              if (payload.chunk) {
                accumulated += payload.chunk;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = {
                    role: 'model',
                    text: accumulated,
                    timestamp: new Date().toISOString(),
                  };
                  return copy;
                });
              }
            } catch (parseErr: any) {
              if (parseErr?.message && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to reach AI assistant.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <aside
      aria-label="AI Shopping Assistant"
      className="rounded-2xl bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col h-full max-h-[680px]"
    >
      <div className="px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#15803D] dark:text-[#8BF0B0]" />
          <h2 className="font-display text-sm font-semibold text-[#101216] dark:text-white">
            {t.aiAssistant}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void saveConversation(sessionTitle, messages)}
          title="Save conversation"
          aria-label="Save conversation"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-black/[0.1] dark:border-white/[0.1] text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white cursor-pointer"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`text-sm leading-relaxed rounded-xl p-3 ${
              m.role === 'user'
                ? 'ml-6 bg-[#15803D]/10 dark:bg-[#8BF0B0]/15 text-[#101216] dark:text-white'
                : 'mr-4 bg-[#F7F8FA] dark:bg-[#101217] text-[#101216] dark:text-white/90 border border-black/[0.06] dark:border-white/[0.06]'
            }`}
          >
            <div className="whitespace-pre-wrap">{m.text || (streaming ? 'Thinking...' : '')}</div>
          </div>
        ))}
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg p-2.5">
            {error}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp}
              type="button"
              onClick={() => void sendMessage(qp)}
              disabled={streaming}
              className="px-2.5 py-1 text-xs rounded-md bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.08] dark:border-white/[0.08] text-[#4B5563] dark:text-[#A0A6B0] hover:text-[#101216] dark:hover:text-white cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="assistant-chat-input" className="sr-only">
            Ask AI shopping assistant
          </label>
          <input
            id="assistant-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.askFollowUp}
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#F7F8FA] dark:bg-[#101217] border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white focus:outline-none focus:border-[#15803D] dark:focus:border-[#8BF0B0]"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            aria-label="Send message"
            className="p-2 rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
