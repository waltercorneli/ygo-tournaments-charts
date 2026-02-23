import { useMemo } from "react";

const PALETTE = [
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
  "#C9CBCF",
  "#7BC8A4",
  "#E74C3C",
  "#3498DB",
];

function getColor(index: number): string {
  if (index < PALETTE.length) return PALETTE[index];
  return `hsl(${(index * 137) % 360}, 65%, 55%)`;
}

export interface DecksChartData {
  labels: string[];
  data: number[];
  colors: string[];
}

export function useDecksInfos(decks: string[]): DecksChartData {
  return useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const deck of decks) {
      const name = deck.trim() === "" ? "OTHER" : deck.trim().toUpperCase();
      grouped[name] = (grouped[name] ?? 0) + 1;
    }

    const labels = Object.keys(grouped);
    const data = Object.values(grouped);
    const colors = labels.map((_, i) => getColor(i));

    return { labels, data, colors };
  }, [decks]);
}
