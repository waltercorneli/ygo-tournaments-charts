"use client";

import { useEffect, useRef } from "react";
import { Chart, ArcElement, Tooltip, Legend, PieController } from "chart.js";
import type { Plugin } from "chart.js";
import { DecksChartData } from "../hooks/useDecksInfos";
import { useDeckArtworks } from "../hooks/useDeckArtworks";

Chart.register(ArcElement, Tooltip, Legend, PieController);

export function PieChart({ labels, data, colors }: DecksChartData) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  // Store loaded HTMLImageElement per label so the plugin can use them
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const artworks = useDeckArtworks(labels);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const total = data.reduce((a, b) => a + b, 0);

    // Load all artwork images in parallel before creating the chart
    const loadImages = async () => {
      await Promise.all(
        labels.map((label) => {
          const imageUrl = artworks[label];
          if (!imageUrl) return Promise.resolve();
          // Reuse already-loaded image if URL hasn't changed
          if (imagesRef.current[label]?.src === imageUrl)
            return Promise.resolve();

          return new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrl;
            img.onload = () => {
              imagesRef.current[label] = img;
              resolve();
            };
            img.onerror = () => resolve();
          });
        }),
      );
    };

    // Plugin: after Chart.js draws the arcs, overlay each image clipped to its arc
    const imagePlugin: Plugin<"pie"> = {
      id: "arcImages",
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);

        meta.data.forEach((arc, i) => {
          const label = labels[i];
          const img = imagesRef.current[label];
          if (!img) return;

          // ArcElement exposes these properties at runtime
          const el = arc as ArcElement & {
            x: number;
            y: number;
            startAngle: number;
            endAngle: number;
            outerRadius: number;
            innerRadius: number;
          };

          ctx.save();

          // Clip to the arc path
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.arc(el.x, el.y, el.outerRadius, el.startAngle, el.endAngle);
          ctx.closePath();
          ctx.clip();

          // Draw image centered on the arc center, scaled to cover the slice area
          const size = el.outerRadius * 2;
          const scale = Math.max(
            size / img.naturalWidth,
            size / img.naturalHeight,
          );
          const sw = img.naturalWidth * scale;
          const sh = img.naturalHeight * scale;
          ctx.drawImage(img, el.x - sw / 2, el.y - sh / 2, sw, sh);

          ctx.restore();
        });
      },
    };

    let active = true;

    loadImages().then(() => {
      if (!active || !canvasRef.current) return;

      chartRef.current?.destroy();

      chartRef.current = new Chart(canvas, {
        type: "pie",
        plugins: [imagePlugin],
        data: {
          labels,
          // Use solid colors for the base layer (also used in the legend)
          datasets: [{ data, backgroundColor: colors }],
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
                  return (chart.data.labels as string[]).map((lbl, i) => {
                    const value = rawData[i];
                    const pct = ((value / total) * 100).toFixed(1);
                    return {
                      text: `${lbl}: ${value} (${pct}%)`,
                      fillStyle: colors[i],
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
    });

    return () => {
      active = false;
      chartRef.current?.destroy();
    };
  }, [labels, data, colors, artworks]);

  return <canvas ref={canvasRef} />;
}
