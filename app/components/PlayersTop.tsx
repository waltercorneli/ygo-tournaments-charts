"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlayerEntry } from "./PlayerChart";
import { useDeckArtworks } from "../hooks/useDeckArtworks";

const POSITIONS = ["🥇", "🥈", "🥉", "🥉"];

type ImageSettings = { scale: number; offsetX: number; offsetY: number };
const DEFAULT_SETTINGS: ImageSettings = { scale: 1, offsetX: 0, offsetY: 0 };

// ── Mobile arrow pad ──────────────────────────────────────────────────────
const ARROW_STEP = 20;
const ARROW_MAX_OFFSET = 400;

function ArrowPad({
  offsetX,
  offsetY,
  onChange,
}: {
  offsetX: number;
  offsetY: number;
  onChange: (x: number, y: number) => void;
}) {
  const clamp = (v: number) =>
    Math.max(-ARROW_MAX_OFFSET, Math.min(ARROW_MAX_OFFSET, v));

  const move = (dx: number, dy: number) =>
    onChange(clamp(offsetX + dx), clamp(offsetY + dy));

  const btnCls =
    "flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-lg text-gray-700 active:bg-gray-200 select-none";

  return (
    <div className="grid grid-cols-3 gap-1">
      <span />
      <button
        className={btnCls}
        onPointerDown={() => move(0, -ARROW_STEP)}
        title="Su"
      >
        ▲
      </button>
      <span />
      <button
        className={btnCls}
        onPointerDown={() => move(-ARROW_STEP, 0)}
        title="Sinistra"
      >
        ◀
      </button>
      <span />
      <button
        className={btnCls}
        onPointerDown={() => move(ARROW_STEP, 0)}
        title="Destra"
      >
        ▶
      </button>
      <span />
      <button
        className={btnCls}
        onPointerDown={() => move(0, ARROW_STEP)}
        title="Giù"
      >
        ▼
      </button>
      <span />
    </div>
  );
}

// ── Drag pad ──────────────────────────────────────────────────────────────
const PAD_SIZE = 80;
const PAD_MAX_OFFSET = 200;

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
  type DragOrigin = {
    startX: number;
    startY: number;
    initOffX: number;
    initOffY: number;
  };
  const dragOrigin = useRef<DragOrigin | null>(null);
  const dotX = (offsetX / PAD_MAX_OFFSET) * half + half;
  const dotY = (offsetY / PAD_MAX_OFFSET) * half + half;

  return (
    <div
      className="relative cursor-crosshair select-none overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
      style={{ width: PAD_SIZE, height: PAD_SIZE }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragOrigin.current = {
          startX: e.clientX,
          startY: e.clientY,
          initOffX: offsetX,
          initOffY: offsetY,
        };
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        if (!dragOrigin.current) return;
        const { startX, startY, initOffX, initOffY } = dragOrigin.current;
        const clamp = (v: number) =>
          Math.max(-PAD_MAX_OFFSET, Math.min(PAD_MAX_OFFSET, v));
        onChange(
          Math.round(
            clamp(initOffX + ((e.clientX - startX) / half) * PAD_MAX_OFFSET),
          ),
          Math.round(
            clamp(initOffY + ((e.clientY - startY) / half) * PAD_MAX_OFFSET),
          ),
        );
      }}
      onPointerUp={() => {
        dragOrigin.current = null;
      }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="h-px w-full bg-gray-300" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-full w-px bg-gray-300" />
      </div>
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 shadow"
        style={{ left: dotX, top: dotY }}
      />
    </div>
  );
}

// ── ArtworkBox ────────────────────────────────────────────────────────────
function ArtworkBox({
  label,
  url,
  settings,
  isDark,
  onClick,
}: {
  label: string;
  url?: string;
  settings?: ImageSettings;
  isDark: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const scale = settings?.scale ?? 1;
  const ox = settings?.offsetX ?? 0;
  const oy = settings?.offsetY ?? 0;

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded cursor-pointer hover:ring-2 hover:ring-blue-400 transition-shadow"
      style={{ width: 100, height: 30 }}
      onClick={onClick}
      title="Clicca per cambiare immagine"
    >
      <div
        className={`absolute inset-0 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
        data-export-hide="true"
      />
      {url && (
        <img
          src={url}
          alt={label}
          crossOrigin="anonymous"
          data-export-below="true"
          style={{
            position: "absolute",
            left: `calc(50% + ${ox}px)`,
            top: `calc(50% + ${oy}px)`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            minWidth: "100%",
            minHeight: "100%",
            maxWidth: "none",
            objectFit: "cover",
          }}
        />
      )}
      <div
        className="absolute inset-x-0 bottom-0 px-1 py-0.5"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65) 80%, transparent)",
        }}
      >
        <span
          className="block text-center leading-tight text-white font-bold"
          style={{
            fontSize: "0.62rem",
            WebkitTextStroke: "0.3px rgba(0,0,0,0.8)",
            textShadow: "0 0 3px rgba(0,0,0,0.9)",
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        >
          {label || "—"}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
interface PlayersTopProps {
  players: PlayerEntry[];
  isDark?: boolean;
  isDarkTitle?: boolean;
  panelOpacity?: number;
  /** Default images from PieChart (used only if no local override yet) */
  sliceImages?: Record<string, string>;
  /** Default settings from PieChart (used only if no local override yet) */
  imageSettings?: Record<string, ImageSettings>;
}

type PickerState = { label: string; x: number; y: number };

export function PlayersTop({
  players,
  isDark = false,
  isDarkTitle = isDark,
  panelOpacity = 60,
  sliceImages = {},
  imageSettings: pieSettings = {},
}: PlayersTopProps) {
  const filled = players.filter((p) => p.name.trim() !== "");
  const deckKeys = [
    ...new Set(
      players.map((p) => p.deck.trim().toUpperCase()).filter((k) => k !== ""),
    ),
  ];

  const artworkOptions = useDeckArtworks(deckKeys);

  const [localImages, setLocalImages] = useState<Record<string, string>>({});
  const [localSettings, setLocalSettings] = useState<
    Record<string, ImageSettings>
  >({});
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [customImages, setCustomImages] = useState<Record<string, string[]>>(
    {},
  );
  const [pagedOptions, setPagedOptions] = useState<Record<string, string[]>>(
    {},
  );
  type PageInfo = { offset: number; hasMore: boolean; loading: boolean };
  const [pickerPages, setPickerPages] = useState<Record<string, PageInfo>>({});

  const pickerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadLabelRef = useRef<string | null>(null);

  // Detect small screens (< 768 px, i.e. below the Tailwind "md" breakpoint)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Seed from PieChart sliceImages (only keys not yet locally set)
  useEffect(() => {
    setLocalImages((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(sliceImages)) {
        if (!next[k]) next[k] = v;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sliceImages)]);

  // Seed from PieChart imageSettings (rescale offset to local box-px)
  useEffect(() => {
    setLocalSettings((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(pieSettings)) {
        if (!next[k]) {
          next[k] = {
            scale: v.scale,
            offsetX: Math.round(v.offsetX * 0.18),
            offsetY: Math.round(v.offsetY * 0.18),
          };
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pieSettings)]);

  // Auto-select first artwork when options load
  useEffect(() => {
    setLocalImages((prev) => {
      const next = { ...prev };
      for (const [label, urls] of Object.entries(artworkOptions)) {
        if (urls.length > 0 && !next[label]) next[label] = urls[0];
      }
      return next;
    });
  }, [artworkOptions]);

  // Close picker on outside click
  useEffect(() => {
    if (!picker) return;
    const handler = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPicker(null);
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [picker]);

  // Init pagination when picker opens on a new label
  useEffect(() => {
    if (!picker) return;
    const label = picker.label;
    if (pickerPages[label]) return;
    setPickerPages((prev) => ({
      ...prev,
      [label]: {
        offset: 0,
        hasMore: (artworkOptions[label]?.length ?? 0) >= 6,
        loading: false,
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker?.label]);

  const currentOptions = (label: string): string[] => [
    ...(pagedOptions[label] ?? artworkOptions[label] ?? []),
    ...(customImages[label] ?? []),
  ];

  const fetchPage = async (label: string, offset: number) => {
    setPickerPages((prev) => ({
      ...prev,
      [label]: { ...prev[label], loading: true },
    }));
    const queryName = label === "OTHER" ? "Mulcharmy Fuwalos" : label;
    try {
      const res = await fetch(
        `/api/deck-artwork?name=${encodeURIComponent(queryName)}&offset=${offset}`,
      );
      const { imageUrls, hasMore } = (await res.json()) as {
        imageUrls: string[];
        hasMore: boolean;
      };
      const proxied = imageUrls.map(
        (url: string) => `/api/card-image?url=${encodeURIComponent(url)}`,
      );
      if (offset === 0) {
        setPagedOptions((prev) => {
          const next = { ...prev };
          delete next[label];
          return next;
        });
      } else {
        setPagedOptions((prev) => ({ ...prev, [label]: proxied }));
      }
      setPickerPages((prev) => ({
        ...prev,
        [label]: { offset, hasMore, loading: false },
      }));
    } catch {
      setPickerPages((prev) => ({
        ...prev,
        [label]: {
          ...(prev[label] ?? { offset: 0, hasMore: false }),
          loading: false,
        },
      }));
    }
  };

  const updateSettings = (label: string, patch: Partial<ImageSettings>) =>
    setLocalSettings((prev) => ({
      ...prev,
      [label]: { ...(prev[label] ?? DEFAULT_SETTINGS), ...patch },
    }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const label = uploadLabelRef.current;
    if (!file || !label) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomImages((prev) => ({
        ...prev,
        [label]: [...(prev[label] ?? []), dataUrl],
      }));
      setLocalImages((prev) => ({ ...prev, [label]: dataUrl }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const renderPickerInner = (label: string) => (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <button
          onClick={() => setPicker(null)}
          className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="Chiudi"
        >
          ✕
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex items-center gap-1 px-2 pt-2">
        <button
          onClick={() =>
            fetchPage(label, (pickerPages[label]?.offset ?? 0) - 6)
          }
          disabled={!pickerPages[label]?.offset || pickerPages[label]?.loading}
          className="flex h-8 w-6 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25"
        >
          ◀
        </button>
        <div className="flex flex-1 flex-wrap justify-center gap-2">
          {pickerPages[label]?.loading ? (
            <span className="py-6 text-xs text-gray-400">Caricamento…</span>
          ) : (
            currentOptions(label).map((url, i) => (
              <button
                key={url}
                title={`Opzione ${i + 1}`}
                onClick={() => {
                  setLocalImages((prev) => ({ ...prev, [label]: url }));
                  setPicker(null);
                }}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-transform hover:scale-110 ${
                  localImages[label] === url
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
            ))
          )}
        </div>
        <button
          onClick={() =>
            fetchPage(label, (pickerPages[label]?.offset ?? 0) + 6)
          }
          disabled={!pickerPages[label]?.hasMore || pickerPages[label]?.loading}
          className="flex h-8 w-6 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25"
        >
          ▶
        </button>
      </div>

      {/* Upload */}
      <div className="px-3 pb-2 pt-1">
        <button
          onClick={() => {
            uploadLabelRef.current = label;
            fileInputRef.current?.click();
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          ＋ Carica immagine personalizzata
        </button>
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
          value={localSettings[label]?.scale ?? 1}
          onChange={(e) =>
            updateSettings(label, { scale: parseFloat(e.target.value) })
          }
          className="flex-1 accent-blue-500"
        />
        <span className="w-8 text-right text-xs text-gray-500">
          {Math.round((localSettings[label]?.scale ?? 1) * 100)}%
        </span>
      </div>

      {/* Position pad */}
      <div className="flex items-center gap-3 border-t border-gray-100 px-3 py-2 justify-center">
        <span title="Posizione" className="select-none text-base">
          ✥
        </span>
        {isMobile ? (
          <ArrowPad
            offsetX={localSettings[label]?.offsetX ?? 0}
            offsetY={localSettings[label]?.offsetY ?? 0}
            onChange={(x, y) =>
              updateSettings(label, { offsetX: x, offsetY: y })
            }
          />
        ) : (
          <DragPad
            offsetX={localSettings[label]?.offsetX ?? 0}
            offsetY={localSettings[label]?.offsetY ?? 0}
            onChange={(x, y) =>
              updateSettings(label, { offsetX: x, offsetY: y })
            }
          />
        )}
        <button
          onClick={() => updateSettings(label, { offsetX: 0, offsetY: 0 })}
          className="text-sm text-gray-400 hover:text-gray-700"
          title="Reset posizione"
        >
          ↺
        </button>
      </div>
    </>
  );

  if (filled.length === 0) return null;

  const cols = Math.min(2, filled.length);
  const rowsPerCol = Math.ceil(filled.length / cols);

  const ordered = Array.from({ length: players.length }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const origIndex = col * rowsPerCol + row;
    return { player: players[origIndex] ?? players[i], origIndex };
  });

  return (
    <div className="flex flex-col gap-2 h-full">
      <h2
        className={`text-[0.875rem] font-bold ${isDarkTitle ? "text-white" : "text-gray-900"}`}
      >
        CLASSIFICA
      </h2>
      <div
        className={`w-full flex-1 rounded border px-5 py-4 backdrop-blur-[4px] ${isDark ? "border-gray-600/70" : "border-gray-200/70"}`}
        style={{
          backgroundColor: isDark
            ? `rgba(31,41,55,${panelOpacity / 100})`
            : `rgba(249,250,251,${panelOpacity / 100})`,
        }}
      >
        <div className="flex gap-16 h-full">
          {Array.from({ length: cols }, (_, c) => (
            <div
              key={c}
              className="grid items-center gap-x-2 gap-y-2 flex-1 min-w-0"
              style={{
                gridTemplateColumns: "auto auto auto 1fr auto auto",
                gridTemplateRows: `repeat(${rowsPerCol}, 1fr)`,
              }}
            >
              {ordered
                .filter((_, i) => i % cols === c)
                .map(({ player, origIndex }, r) => {
                  const deckKey = player.deck.trim().toUpperCase();
                  return (
                    <Fragment key={r}>
                      <span className="text-[0.9375rem] leading-none">
                        {POSITIONS[origIndex] ?? "🎖️"}
                      </span>
                      <span
                        className={`text-[1rem] font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {origIndex + 1}°
                      </span>
                      <span
                        className={`text-[1rem] ${isDark ? "text-gray-500" : "text-gray-400"}`}
                      >
                        |
                      </span>
                      <span
                        className={`font-semibold text-[1rem] truncate ${isDark ? "text-white" : "text-gray-900"}`}
                      >
                        {player.name.trim() || "—"}
                      </span>
                      <span
                        className={`text-[1rem] ${isDark ? "text-gray-500" : "text-gray-400"}`}
                      >
                        |
                      </span>
                      <ArtworkBox
                        label={player.deck.trim()}
                        url={localImages[deckKey]}
                        settings={localSettings[deckKey]}
                        isDark={isDark}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPicker({
                            label: deckKey,
                            x: rect.left,
                            y: rect.top - 6,
                          });
                        }}
                      />
                    </Fragment>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop floating picker ─────────────────────────────────────── */}
      {!isMobile &&
        picker &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed z-50 w-80 rounded-xl border border-gray-200 bg-white/50 shadow-2xl backdrop-blur-[2px]"
            style={{ left: picker.x, bottom: window.innerHeight - picker.y }}
          >
            {renderPickerInner(picker.label)}
          </div>,
          document.body,
        )}

      {/* ── Mobile panel: fixed bottom, portalled to body.
          z-[20] keeps it below the drawer (z-40) and backdrop (z-30)
          so opening the menu naturally covers it. */}
      {isMobile &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed bottom-0 left-0 right-0 z-[20] border-t border-gray-200 bg-white shadow-2xl"
          >
            {picker ? (
              <div className="max-h-[50vh] overflow-y-auto">
                {renderPickerInner(picker.label)}
              </div>
            ) : (
              <p className="px-4 py-3 text-center text-xs text-gray-400">
                Tocca un&apos;immagine del mazzo per cambiarla
              </p>
            )}
          </div>,
          document.body,
        )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
