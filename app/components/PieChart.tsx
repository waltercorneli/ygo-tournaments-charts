"use client";

import React, { useEffect, useRef, useState } from "react";
import { Chart, ArcElement, Tooltip, Legend, PieController } from "chart.js";
import type { Plugin } from "chart.js";
import { DecksChartData } from "../hooks/useDecksInfos";
import { useDeckArtworks } from "../hooks/useDeckArtworks";

Chart.register(ArcElement, Tooltip, Legend, PieController);

type PickerState = { label: string; x: number; y: number };
type ImageEntry = { img: HTMLImageElement; url: string };
type ImageSettings = { scale: number; offsetX: number; offsetY: number };
const DEFAULT_SETTINGS: ImageSettings = { scale: 1, offsetX: 0, offsetY: 0 };

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

  const pickerRef = useRef<PickerState | null>(null);
  pickerRef.current = picker;

  const [imageSettings, setImageSettings] = useState<
    Record<string, ImageSettings>
  >({});
  const settingsRef = useRef<Record<string, ImageSettings>>({});
  settingsRef.current = imageSettings;

  const updateSettings = (label: string, patch: Partial<ImageSettings>) =>
    setImageSettings((prev) => ({
      ...prev,
      [label]: { ...(prev[label] ?? DEFAULT_SETTINGS), ...patch },
    }));

  // Redraw chart whenever settings change
  useEffect(() => {
    chartRef.current?.update();
  }, [imageSettings]);

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
          const {
            scale: scaleMultiplier = 1,
            offsetX = 0,
            offsetY = 0,
          } = settingsRef.current[label] ?? DEFAULT_SETTINGS;
          const size = el.outerRadius * 2;
          const baseScale = Math.max(
            size / img.naturalWidth,
            size / img.naturalHeight,
          );
          const finalScale = baseScale * scaleMultiplier;
          const sw = img.naturalWidth * finalScale;
          const sh = img.naturalHeight * finalScale;
          ctx.drawImage(
            img,
            el.x - sw / 2 + offsetX,
            el.y - sh / 2 + offsetY,
            sw,
            sh,
          );
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

          {/* Scale */}
          <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-2">
            <span title="Scala" className="select-none text-base">
              🔍
            </span>
            <input
              type="range"
              min={0.3}
              max={4}
              step={0.05}
              value={imageSettings[picker.label]?.scale ?? 1}
              onChange={(e) =>
                updateSettings(picker.label, {
                  scale: parseFloat(e.target.value),
                })
              }
              className="flex-1 accent-blue-500"
            />
            <span className="w-8 text-right text-xs text-gray-500">
              {Math.round((imageSettings[picker.label]?.scale ?? 1) * 100)}%
            </span>
          </div>

          {/* Position pad */}
          <div className="flex items-center gap-3 border-t border-gray-100 px-3 py-2">
            <span title="Posizione" className="select-none text-base">
              ✥
            </span>
            <DragPad
              offsetX={imageSettings[picker.label]?.offsetX ?? 0}
              offsetY={imageSettings[picker.label]?.offsetY ?? 0}
              onChange={(x, y) =>
                updateSettings(picker.label, { offsetX: x, offsetY: y })
              }
            />
            <button
              onClick={() =>
                updateSettings(picker.label, { offsetX: 0, offsetY: 0 })
              }
              className="text-sm text-gray-400 hover:text-gray-700"
              title="Reset posizione"
            >
              ↺
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2D drag pad for image offset ────────────────────────────────────────
const PAD_SIZE = 80;
const PAD_MAX_OFFSET = 150;

function DragPad({
  offsetX,
  offsetY,
  onChange,
}: {
  offsetX: number;
  offsetY: number;
  onChange: (x: number, y: number) => void;
}) {
  const half = PAD_SIZE / 2;

  // Map offset [-MAX, MAX] → px position [0, PAD_SIZE]
  const dotX = (offsetX / PAD_MAX_OFFSET) * half + half;
  const dotY = (offsetY / PAD_MAX_OFFSET) * half + half;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(PAD_SIZE, e.clientX - rect.left));
    const y = Math.max(0, Math.min(PAD_SIZE, e.clientY - rect.top));
    onChange(
      Math.round(((x - half) / half) * PAD_MAX_OFFSET),
      Math.round(((y - half) / half) * PAD_MAX_OFFSET),
    );
  };

  return (
    <div
      className="relative cursor-crosshair select-none overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
      style={{ width: PAD_SIZE, height: PAD_SIZE }}
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onPointerMove={handlePointerMove}
    >
      {/* crosshair */}
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="h-px w-full bg-gray-300" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-full w-px bg-gray-300" />
      </div>
      {/* draggable dot */}
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 shadow"
        style={{ left: dotX, top: dotY }}
      />
    </div>
  );
}
