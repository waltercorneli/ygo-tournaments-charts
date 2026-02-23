"use client";

import { useEffect, useRef } from "react";
import { Chart, ArcElement, Tooltip, Legend, PieController } from "chart.js";
import { DecksChartData } from "../hooks/useDecksInfos";

Chart.register(ArcElement, Tooltip, Legend, PieController);

export function PieChart({ labels, data, colors }: DecksChartData) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bgColors: (string | CanvasPattern)[] = [...colors];

    chartRef.current?.destroy();

    const img = new Image();
    img.src = "/images/test-pie-1.webp";

    img.onload = () => {
      const pattern = ctx.createPattern(img, "repeat");
      if (pattern) bgColors[0] = pattern;

      const total = data.reduce((a, b) => a + b, 0);

      chartRef.current = new Chart(canvas, {
        type: "pie",
        data: {
          labels,
          datasets: [{ data, backgroundColor: bgColors }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "left",
              labels: {
                generateLabels: (chart) => {
                  const dataset = chart.data.datasets[0];
                  const rawData = dataset.data as number[];
                  return (chart.data.labels as string[]).map((label, i) => {
                    const value = rawData[i];
                    const pct = ((value / total) * 100).toFixed(1);
                    const bg = Array.isArray(dataset.backgroundColor)
                      ? dataset.backgroundColor[i]
                      : dataset.backgroundColor;
                    return {
                      text: `${label}: ${value} (${pct}%)`,
                      fillStyle: typeof bg === "string" ? bg : colors[i],
                      strokeStyle: "transparent",
                      hidden: false,
                      index: i,
                    };
                  });
                },
              },
            },
            tooltip: {
              callbacks: {
                label: (context) =>
                  ` ${context.label}: ${context.parsed} (${(
                    (context.parsed / total) *
                    100
                  ).toFixed(1)}%)`,
              },
            },
          },
        },
      });
    };

    return () => {
      chartRef.current?.destroy();
    };
  }, [labels, data, colors]);

  return <canvas ref={canvasRef} />;
}
