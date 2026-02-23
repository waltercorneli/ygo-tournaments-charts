import { useEffect, useState } from "react";

// Returns a map of label → proxied image URL for each deck name
export function useDeckArtworks(labels: string[]): Record<string, string> {
  const [artworks, setArtworks] = useState<Record<string, string>>({});

  useEffect(() => {
    const uniqueLabels = [...new Set(labels)].filter(
      (l) => l !== "OTHER" && l.trim() !== "",
    );

    if (uniqueLabels.length === 0) {
      setArtworks({});
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      const entries = await Promise.all(
        uniqueLabels.map(async (label) => {
          try {
            const res = await fetch(
              `/api/deck-artwork?name=${encodeURIComponent(label)}`,
            );
            const { imageUrl } = (await res.json()) as {
              imageUrl: string | null;
            };
            if (!imageUrl) return null;
            const proxied = `/api/card-image?url=${encodeURIComponent(imageUrl)}`;
            return [label, proxied] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      const map: Record<string, string> = {};
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
