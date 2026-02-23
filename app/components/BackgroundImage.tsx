"use client";

import { useState, useRef } from "react";

interface Props {
  onImageChange: (url: string | null, opacity: number) => void;
}

export function BackgroundImage({ onImageChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [opacity, setOpacity] = useState(15);
  const lastQueryRef = useRef("");

  const search = async (name: string, newOffset: number) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/deck-artwork?name=${encodeURIComponent(name)}&offset=${newOffset}`,
      );
      const { imageUrls, hasMore: more } = (await res.json()) as {
        imageUrls: string[];
        hasMore: boolean;
      };
      const proxied = imageUrls.map(
        (url: string) => `/api/card-image?url=${encodeURIComponent(url)}`,
      );
      setResults(proxied);
      setOffset(newOffset);
      setHasMore(more);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lastQueryRef.current = query;
    search(query, 0);
  };

  const handleSelect = (url: string) => {
    setSelected(url);
    onImageChange(url, opacity);
  };

  const handleClear = () => {
    setSelected(null);
    setResults([]);
    setQuery("");
    setOffset(0);
    setHasMore(false);
    onImageChange(null, opacity);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Background Image
        </span>
        <span
          title="Cerca il nome di una carta YGO per usarne l'artwork come sfondo del grafico e della classifica."
          className="cursor-help text-gray-400 hover:text-gray-600 text-xs"
        >
          ⓘ
        </span>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome carta (es. Blue-Eyes White Dragon)"
          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
        >
          {loading ? "…" : "Cerca"}
        </button>
        {selected && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 text-xs rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          >
            Rimuovi
          </button>
        )}
      </form>

      {/* Opacity slider — only when an image is selected */}
      {selected && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Opacità</span>
          <input
            type="range"
            min={5}
            max={60}
            step={1}
            value={opacity}
            onChange={(e) => {
              const v = Number(e.target.value);
              setOpacity(v);
              if (selected) onImageChange(selected, v);
            }}
            className="flex-1 accent-indigo-500"
          />
          <span className="w-8 text-right text-xs text-gray-500">
            {opacity}%
          </span>
        </div>
      )}

      {/* Thumbnails with prev/next */}
      {results.length > 0 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => search(lastQueryRef.current, offset - 6)}
            disabled={offset === 0 || loading}
            className="flex h-8 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25"
          >
            ◀
          </button>

          <div className="flex flex-1 flex-wrap gap-2">
            {results.map((url) => (
              <button
                key={url}
                onClick={() => handleSelect(url)}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-transform hover:scale-110 ${
                  selected === url
                    ? "border-indigo-500"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <img
                  src={url}
                  alt="artwork"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <button
            onClick={() => search(lastQueryRef.current, offset + 6)}
            disabled={!hasMore || loading}
            className="flex h-8 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
