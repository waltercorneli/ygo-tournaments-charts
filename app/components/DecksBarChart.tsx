import { useEffect, useState } from "react";
import { DecksChartData } from "../hooks/useDecksInfos";

function dominantColorFromImage(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const SIZE = 64;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("#6b7280");
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

      // Quantize each channel to 4 bits and track sum + count per bucket
      const SHIFT = 4;
      const buckets: Record<
        number,
        { r: number; g: number; b: number; n: number }
      > = {};
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const key =
          ((data[i] >> SHIFT) << 8) |
          ((data[i + 1] >> SHIFT) << 4) |
          (data[i + 2] >> SHIFT);
        if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
        buckets[key].r += data[i];
        buckets[key].g += data[i + 1];
        buckets[key].b += data[i + 2];
        buckets[key].n++;
      }
      const entries = Object.values(buckets);
      if (entries.length === 0) return resolve("#6b7280");

      // For each bucket compute avg RGB and HSL saturation
      const scored = entries.map((b) => {
        const r = b.r / b.n / 255;
        const g = b.g / b.n / 255;
        const bv = b.b / b.n / 255;
        const max = Math.max(r, g, bv);
        const min = Math.min(r, g, bv);
        const l = (max + min) / 2;
        const sat =
          max === min ? 0 : (max - min) / (l < 0.5 ? max + min : 2 - max - min);
        // Weight: frequency * saturation — boosts colours that are both common and vivid
        return { b, score: b.n * sat };
      });

      // Keep top 8 buckets by score, then return their weighted-average colour
      const TOP = 8;
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, TOP).filter((e) => e.score > 0);
      const pool = top.length > 0 ? top : scored.slice(0, 1);

      const totalWeight = pool.reduce((s, e) => s + e.score, 0) || 1;
      let wr = 0,
        wg = 0,
        wb = 0;
      for (const { b, score } of pool) {
        const w = score / totalWeight;
        wr += (b.r / b.n) * w;
        wg += (b.g / b.n) * w;
        wb += (b.b / b.n) * w;
      }

      // Boost: convert to HSL, crank saturation to 1 and clamp lightness to 0.50
      const r1 = wr / 255,
        g1 = wg / 255,
        b1 = wb / 255;
      const max = Math.max(r1, g1, b1);
      const min = Math.min(r1, g1, b1);
      const d = max - min;
      const l = (max + min) / 2;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let h = 0;
      if (d !== 0) {
        if (max === r1) h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6;
        else if (max === g1) h = ((b1 - r1) / d + 2) / 6;
        else h = ((r1 - g1) / d + 4) / 6;
      }
      // Max out saturation, keep hue, fix lightness to vivid range
      const newS = s < 0.15 ? s : 0.8; // leave near-greys alone
      const newL = s < 0.15 ? l : 0.4;
      const hsl2rgb = (hh: number, ss: number, ll: number) => {
        const a = ss * Math.min(ll, 1 - ll);
        const f = (n: number) => {
          const k = (n + hh * 12) % 12;
          return ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        };
        return [f(0) * 255, f(8) * 255, f(4) * 255];
      };
      const [fr, fg, fb] = hsl2rgb(h, newS, newL);
      const toHex = (n: number) =>
        Math.min(255, Math.max(0, Math.round(n)))
          .toString(16)
          .padStart(2, "0");
      resolve(`#${toHex(fr)}${toHex(fg)}${toHex(fb)}`);
    };
    img.onerror = () => resolve("#6b7280");
    img.src = url;
  });
}

export function DecksBarChart({
  labels,
  data,
  colors,
  isDark = false,
  sliceImages = {},
  panelOpacity = 60,
  proportional = false,
}: DecksChartData & {
  isDark?: boolean;
  sliceImages?: Record<string, string>;
  panelOpacity?: number;
  proportional?: boolean;
}) {
  const [artworkColors, setArtworkColors] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const entries = Object.entries(sliceImages);
    if (entries.length === 0) return;

    let cancelled = false;
    Promise.all(
      entries.map(async ([label, url]) => {
        const color = await dominantColorFromImage(url);
        return [label, color] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const [label, color] of results) map[label] = color;
      setArtworkColors(map);
    });

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(sliceImages)]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = data.reduce((s, v) => s + v, 0);
  const max = Math.max(...data);

  if (total === 0) return null;

  return (
    <div
      className={`flex flex-col justify-start gap-3 h-full px-2 py-2 backdrop-blur-sm rounded border ${isDark ? "border-gray-600/70" : "border-gray-200/70"}`}
      style={{
        backgroundColor: isDark
          ? `rgba(31,41,55,${panelOpacity / 100})`
          : `rgba(249,250,251,${panelOpacity / 100})`,
      }}
    >
      {labels.map((label, i) => {
        const barWidth = proportional
          ? (data[i] / total) * 100
          : max > 0
            ? (data[i] / max) * 100
            : 0;
        const color = artworkColors[label] ?? colors[i] ?? "#6b7280";
        return (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[0.9rem] font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {label}
              </span>
              <span
                className={`text-[0.9rem] flex-shrink-0 ${isDark ? "text-gray-300" : "text-gray-500"}`}
              >
                {data[i]}{" "}
                <span
                  className={`text-[0.75rem] ${isDark ? "text-gray-500" : "text-gray-600"}`}
                >
                  / {total}
                </span>
              </span>
            </div>
            {/* Track */}
            <div
              className={`w-full overflow-hidden rounded-full h-2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
            >
              {/* Fill */}
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
