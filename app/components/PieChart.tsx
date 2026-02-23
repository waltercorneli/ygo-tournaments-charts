"use client";

import { useEffect, useRef, useState } from "react";
import { Chart, ArcElement, Tooltip, Legend, PieController } from "chart.js";
import type { Plugin } from "chart.js";
import { DecksChartData } from "../hooks/useDecksInfos";
import { useDeckArtworks } from "../hooks/useDeckArtworks";

Chart.register(ArcElement, Tooltip, Legend, PieController);

type PickerState = { label: string; x: number; y: number };
type ImageEntry = { img: HTMLImageElement; url: string };

export function PieChart({ labels, data, colors }: DecksChartData) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const imagesRef = useRef<Record<string, ImageEntry>>({});

  const imageOptionsRef = useRef<Record<string, string[]>>({});
  const labelsRef = useRef<string[]>(labels);
  labelsRef.current = labels;

  const imageOptions = useDeckArtworks(labels);
  imageOptionsRef.current = imageOptions;

  const [selectedImages, setSelectedImages] = useState<Record<string, string>>(
    {},
  );
  const [picker, setPicker] = useState<PickerState | null>(null);

  // Ref so the stable onHover callback can read the current picker without stale closure
  const pickerRef = useRef<PickerState | null>(null);
  pickerRef.current = picker;

  // Auto-select first image when options load
  useEffect(() => {
    setSelectedImages(() => {
      const next: Record<string, string> = {};
      for (const [label, urls] of Object.entries(imageOptions)) {
        if (urls.length > 0) next[label] = urls[0];
      }
      return next;
    });
  }, [imageOptions]);

  // Load image when selection changes and repaint
  useEffect(() => {
    for (const [label, url] of Object.entries(selectedImages)) {
      if (imagesRef.current[label]?.url === url) continue;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        imagesRef.current[label] = { img, url };
        chartRef.current?.update();
      };
    }
  }, [selectedImages]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const total = data.reduce((a, b) => a + b, 0);

    const imagePlugin: Plugin<"pie"> = {
      id: "arcImages",
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((arc, i) => {
          const label = labelsRef.current[i];
          const entry = imagesRef.current[label];
          if (!entry) return;
          const { img } = entry;
          const el = arc as ArcElement & {
            x: number;
            y: number;
            startAngle: number;
            endAngle: number;
            outerRadius: number;
          };
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.arc(el.x, el.y, el.outerRadius, el.startAngle, el.endAngle);
          ctx.closePath();
          ctx.clip();
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

    chartRef.current?.destroy();

    chartRef.current = new Chart(canvas, {
      type: "pie",
      plugins: [imagePlugin],
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: {
        responsive: true,
        onHover: (event, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const label = labelsRef.current[idx];
            const opts = imageOptionsRef.current[label];
            if (opts && opts.length > 1) {
              // Open or switch to the hovered slice; if already on the same label, keep position fixed
              if (pickerRef.current?.label !== label) {
                const native = event.native as MouseEvent;
                const rect = canvas.getBoundingClientRect();
                setPicker({
                  label,
                  x: native.clientX - rect.left,
                  y: native.clientY - rect.top,
                });
              }
            }
          }
        },
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

    return () => {
      chartRef.current?.destroy();
    };
  }, [labels, data, colors]);

  const handleSelect = (label: string, url: string) => {
    setSelectedImages((prev) => ({ ...prev, [label]: url }));
    setPicker(null);
  };

  return (
    <div className="relative">
      <canvas ref={canvasRef} />

      {picker && (imageOptions[picker.label]?.length ?? 0) > 0 && (
        <div
          className="absolute z-50 rounded-xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-sm"
          style={{ left: picker.x + 14, top: picker.y - 44 }}
        >
          {/* Header with label name and close button */}
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-3 py-2">
            <span className="text-xs font-semibold text-gray-600">
              {picker.label}
            </span>
            <button
              onClick={() => setPicker(null)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Chiudi"
            >
              ✕
            </button>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 p-2">
            {imageOptions[picker.label].map((url, i) => (
              <button
                key={i}
                title={`Opzione ${i + 1}`}
                onClick={() => handleSelect(picker.label, url)}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-transform hover:scale-110 ${
                  selectedImages[picker.label] === url
                    ? "border-blue-500"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <img
                  src={url}
                  alt={`opzione ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
