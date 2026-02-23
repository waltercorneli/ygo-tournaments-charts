import { useEffect, useState } from "react";

// Returns a map of label → array of up to 6 proxied image URLs
export function useDeckArtworks(labels: string[]): Record<string, string[]> {
  const [artworks, setArtworks] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const uniqueLabels = [...new Set(labels)].filter((l) => l.trim() !== "");

    if (uniqueLabels.length === 0) {
      setArtworks({});
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      const entries = await Promise.all(
        uniqueLabels.map(async (label) => {
          // "OTHER" always uses Mulcharmy Fuwalos as artwork
          const queryName = label === "OTHER" ? "Mulcharmy Fuwalos" : label;
          try {
            const res = await fetch(
              `/api/deck-artwork?name=${encodeURIComponent(queryName)}`,
            );
            const { imageUrls } = (await res.json()) as {
              imageUrls: string[];
            };
            if (!imageUrls?.length) return null;
            const proxied = imageUrls.map(
              (url) => `/api/card-image?url=${encodeURIComponent(url)}`,
            );
            return [label, proxied] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      const map: Record<string, string[]> = {};
      for (const entry of entries) {
        if (entry) map[entry[0]] = entry[1];
      }
      setArtworks(map);
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels.join(",")]);

  return artworks;
}
