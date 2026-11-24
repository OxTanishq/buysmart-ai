import React, { useState } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../shared/types';

export const ImageSearchPage: React.FC = () => {
  const { currency, navigate, showToast } = useApp();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    category: string;
    brand: string;
    modelNumber: string;
    confidence: string;
    identificationNotes: string;
    searchKeywords: string;
    visibleFeatures: string[];
  } | null>(null);
  const [matches, setMatches] = useState<Product[]>([]);

  const processFile = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB.');
      return;
    }
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(String(reader.result));
      setAnalysis(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!previewUrl) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: previewUrl, mimeType, currency }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Image identification failed.');
      setAnalysis(data.analysis);
      setMatches(data.similarProducts || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to analyze image right now.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) processFile(file);
      }
    }
  };

  return (
    <main
      onPaste={handlePaste}
      className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-20 space-y-8"
    >
      <div>
        <h1 className="font-display text-3xl font-bold text-[#101216] dark:text-white">
          Search by Product Image
        </h1>
        <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0] mt-1">
          Upload a photo, capture via mobile camera, or paste a screenshot (Ctrl/Cmd+V). Uploaded buffers are never stored on disk.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) processFile(f);
        }}
        className="rounded-2xl p-8 bg-white dark:bg-[#171A20] border-2 border-dashed border-black/[0.15] dark:border-white/[0.15] text-center space-y-4"
      >
        {!previewUrl ? (
          <>
            <Upload className="w-8 h-8 mx-auto text-[#4B5563] dark:text-[#A0A6B0]" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#101216] dark:text-white">
                Drag and drop a product photo, or paste a screenshot
              </p>
              <p className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">
                Supports JPEG, PNG, and WebP up to 5MB.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Choose Image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                  }}
                  className="hidden"
                />
              </label>

              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-[#101216] dark:text-white cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <span>Mobile Camera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <img
              src={previewUrl}
              alt="Uploaded product preview"
              className="max-h-72 mx-auto rounded-xl object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Identifying Product...' : 'Identify & Find Matches'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setAnalysis(null);
                  setMatches([]);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Image</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/25 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {analysis && (
        <section className="rounded-2xl p-6 bg-white dark:bg-[#171A20] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-[#101216] dark:text-white">
              Visual Identification Summary
            </h2>
            <span className="font-mono text-xs font-semibold text-[#15803D] dark:text-[#8BF0B0]">
              Confidence: {analysis.confidence}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Category</div>
              <div className="font-semibold text-[#101216] dark:text-white capitalize">{analysis.category}</div>
            </div>
            <div>
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Visible Brand Markings</div>
              <div className="font-semibold text-[#101216] dark:text-white">{analysis.brand}</div>
            </div>
            <div>
              <div className="text-xs text-[#4B5563] dark:text-[#A0A6B0]">Model Number (OCR)</div>
              <div className="font-mono font-semibold text-[#101216] dark:text-white">{analysis.modelNumber}</div>
            </div>
          </div>

          <p className="text-sm text-[#4B5563] dark:text-[#A0A6B0]">{analysis.identificationNotes}</p>

          <button
            type="button"
            onClick={() => navigate(`/search?q=${encodeURIComponent(analysis.searchKeywords)}`)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white dark:bg-[#8BF0B0] dark:text-[#08090B] cursor-pointer"
          >
            Run Full Live Search for "{analysis.searchKeywords}"
          </button>
        </section>
      )}

      {matches.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[#101216] dark:text-white">
            Similar & Cheaper Alternatives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
