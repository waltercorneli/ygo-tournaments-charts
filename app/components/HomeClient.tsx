"use client";

import { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import { PlayerChart } from "./PlayerChart";
import { PlayersTop } from "./PlayersTop";
import { DecksChart } from "./DecksChart";
import { PieChart } from "./PieChart";
import { BackgroundImage } from "./BackgroundImage";
import { TournamentInfo } from "./TournamentInfo";
import { TournamentChart } from "./TournamentChart";
import { TeamInfo } from "./TeamInfo";
import { DecksBarChart } from "./DecksBarChart";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { useDecksInfos, DeckEntry } from "../hooks/useDecksInfos";
import { usePlayersInfos } from "../hooks/usePlayersInfos";
import { useTournamentInfos } from "../hooks/useTournamentInfos";

const EXPORT_SIZE = 1080;

export function HomeClient() {
  const playersInfos = usePlayersInfos(4);

  const [decks, setDecks] = useState<DeckEntry[]>([
    { name: "Snake-Eye", qty: 28 },
    { name: "Yubel", qty: 22 },
    { name: "Branded", qty: 18 },
    { name: "Tenpai Dragon", qty: 15 },
    { name: "OTHER", qty: 45 },
  ]);

  const handleDeckChange = (
    index: number,
    field: keyof DeckEntry,
    value: string,
  ) =>
    setDecks((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "qty" ? Math.max(1, Number(value)) : value,
      };
      return updated;
    });

  const addDeck = () =>
    setDecks((prev) => [...prev, { name: "", qty: 1, imageSearch: "" }]);
  const removeDeck = (index: number) =>
    setDecks((prev) => prev.filter((_, i) => i !== index));
  const clearDecks = () =>
    setDecks((prev) =>
      prev.map(({ name, imageSearch }) => ({ name, qty: 1, imageSearch })),
    );

  const chartData = useDecksInfos(decks);

  const {
    data: tournamentData,
    setField: setTournamentField,
    setLogoUrl: setTournamentLogoUrl,
  } = useTournamentInfos();

  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(15);
  const [isDark, setIsDark] = useState(true);
  const [showTeamInfo, setShowTeamInfo] = useState(true);
  const [showSideChart, setShowSideChart] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Ref filled by PieChart — returns a canvas data URL only after all artwork
  // images are fully loaded and painted (fixes iOS first-load blank canvas).
  const chartSnapshotRef = useRef<(() => Promise<string>) | null>(null);

  // Lock body scroll while the mobile drawer is open so the page
  // behind the backdrop cannot be scrolled by touch.
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    document.body.style.touchAction = isMenuOpen ? "none" : "";
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isMenuOpen]);

  const handleBgChange = (url: string | null, opacity: number) => {
    setBgUrl(url);
    setBgOpacity(opacity);
  };

  const exportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / EXPORT_SIZE);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const exportPng = async () => {
    if (!exportRef.current) return;
    const el = exportRef.current;
    const prevTransform = el.style.transform;

    // Helper: fetch any URL → base64 data URL.
    const srcToDataUrl = async (src: string): Promise<string | null> => {
      try {
        const abs = src.startsWith("http")
          ? src
          : `${window.location.origin}${src.startsWith("/") ? src : `/${src}`}`;
        const res = await fetch(abs, { cache: "force-cache" });
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };

    // Helper: load an Image from a src, resolve when ready.
    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
      });

    setExportStatus("⏳ Attesa caricamento grafico…");
    el.style.transform = "scale(1)";

    // iOS Safari/Chrome: WebKit does NOT render <img> inside SVG foreignObject
    // (the mechanism html-to-image uses). Text, borders, bg-colors work fine —
    // only <img> and <canvas> go blank. Fix: capture base layer (text only) via
    // toPng with all images hidden, then composite images manually on a canvas.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) {
      // Wait two frames so layout has settled after the transform change.
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );

      const elRect = el.getBoundingClientRect();
      const PR = 2; // 2× is enough for mobile and stays within WebKit canvas limits

      type Layer = {
        dataUrl: string;
        x: number;
        y: number;
        w: number;
        h: number;
        objectFit: string;
        clipX?: number;
        clipY?: number;
        clipW?: number;
        clipH?: number;
        clipR?: number; // border-radius of the clipping ancestor, in CSS px
      };
      const layers: Layer[] = [];
      const hiddenEls: Array<{ el: HTMLElement; vis: string }> = [];
      const hideEl = (e: HTMLElement) => {
        hiddenEls.push({ el: e, vis: e.style.visibility });
        e.style.visibility = "hidden";
      };

      // Walk up the DOM to find the nearest ancestor that clips via
      // overflow:hidden + border-radius (e.g. the rounded-full logo wrapper).
      const findClipAncestor = (
        node: HTMLElement,
      ): { r: DOMRect; radius: number } | null => {
        let cur = node.parentElement;
        while (cur && cur !== el) {
          const cs = getComputedStyle(cur);
          if (cs.overflow === "hidden" || cs.overflow === "clip") {
            const br = parseFloat(cs.borderRadius);
            if (br > 0) {
              return { r: cur.getBoundingClientRect(), radius: br };
            }
          }
          cur = cur.parentElement;
        }
        return null;
      };

      try {
        setExportStatus("🖼️ Snapshot grafico…");

        // 1a. Canvas (PieChart)
        for (const c of Array.from(
          el.querySelectorAll("canvas"),
        ) as HTMLCanvasElement[]) {
          let dataUrl = "";
          try {
            dataUrl = chartSnapshotRef.current
              ? await chartSnapshotRef.current()
              : c.toDataURL("image/png");
          } catch {
            /* tainted — skip */
          }
          if (!dataUrl || dataUrl.length < 200) continue;
          const r = c.getBoundingClientRect();
          layers.push({
            dataUrl,
            objectFit: "fill",
            x: r.left - elRect.left,
            y: r.top - elRect.top,
            w: r.width,
            h: r.height,
          });
          hideEl(c);
        }

        setExportStatus("🔄 Conversione immagini…");

        // 1b. All <img> elements
        for (const imgEl of Array.from(
          el.querySelectorAll("img"),
        ) as HTMLImageElement[]) {
          const src = imgEl.getAttribute("src") ?? "";
          if (!src) continue;
          const dataUrl = src.startsWith("data:")
            ? src
            : await srcToDataUrl(src);
          if (!dataUrl) continue;
          const r = imgEl.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          const clip = findClipAncestor(imgEl);
          layers.push({
            dataUrl,
            objectFit: getComputedStyle(imgEl).objectFit || "fill",
            x: r.left - elRect.left,
            y: r.top - elRect.top,
            w: r.width,
            h: r.height,
            ...(clip
              ? {
                  clipX: clip.r.left - elRect.left,
                  clipY: clip.r.top - elRect.top,
                  clipW: clip.r.width,
                  clipH: clip.r.height,
                  clipR: clip.radius,
                }
              : {}),
          });
          hideEl(imgEl);
        }

        // 2. Capture the DOM (text, shapes, backgrounds) with all images hidden.
        setExportStatus("✏️ Generazione base…");
        const basePng = await toPng(el, {
          pixelRatio: PR,
          width: EXPORT_SIZE,
          height: EXPORT_SIZE,
          skipFonts: true,
        });

        // 3. Composite everything on a single canvas.
        setExportStatus("🎨 Composizione immagine…");
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = EXPORT_SIZE * PR;
        finalCanvas.height = EXPORT_SIZE * PR;
        const ctx = finalCanvas.getContext("2d")!;

        // Base layer (text, backgrounds)
        ctx.drawImage(
          await loadImg(basePng),
          0,
          0,
          finalCanvas.width,
          finalCanvas.height,
        );

        // Image layers in DOM order (preserves z-ordering of the original layout)
        for (const layer of layers) {
          try {
            const img = await loadImg(layer.dataUrl);
            const dx = layer.x * PR;
            const dy = layer.y * PR;
            const dw = layer.w * PR;
            const dh = layer.h * PR;

            ctx.save();

            // Apply clip from ancestor overflow:hidden + border-radius (e.g. rounded logo)
            if (
              layer.clipX !== undefined &&
              layer.clipY !== undefined &&
              layer.clipW !== undefined &&
              layer.clipH !== undefined &&
              layer.clipR !== undefined
            ) {
              const cx = layer.clipX * PR;
              const cy = layer.clipY * PR;
              const cw = layer.clipW * PR;
              const ch = layer.clipH * PR;
              const cr = layer.clipR * PR;
              ctx.beginPath();
              ctx.roundRect(cx, cy, cw, ch, cr);
              ctx.clip();
            }

            if (layer.objectFit === "cover") {
              const scale = Math.max(
                dw / img.naturalWidth,
                dh / img.naturalHeight,
              );
              const sw = dw / scale;
              const sh = dh / scale;
              const sx = (img.naturalWidth - sw) / 2;
              const sy = (img.naturalHeight - sh) / 2;
              ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
            } else if (layer.objectFit === "contain") {
              const scale = Math.min(
                dw / img.naturalWidth,
                dh / img.naturalHeight,
              );
              const sw = img.naturalWidth * scale;
              const sh = img.naturalHeight * scale;
              ctx.drawImage(
                img,
                0,
                0,
                img.naturalWidth,
                img.naturalHeight,
                dx + (dw - sw) / 2,
                dy + (dh - sh) / 2,
                sw,
                sh,
              );
            } else {
              ctx.drawImage(img, dx, dy, dw, dh);
            }

            ctx.restore();
          } catch {
            /* skip any layer that fails to load */
          }
        }

        setExportStatus("✅ Download in corso…");
        const finalDataUrl = finalCanvas.toDataURL("image/png");

        // Safari iOS: link.click() works.
        // Chrome iOS: link.click() is silently blocked — use Web Share API.
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent,
        );
        const fileName = `${tournamentData.name || "torneo"}.png`;
        if (
          !isSafari &&
          typeof navigator.share === "function" &&
          navigator.canShare?.({
            files: [new File([], fileName, { type: "image/png" })],
          })
        ) {
          const res2 = await fetch(finalDataUrl);
          const blob = await res2.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          try {
            await navigator.share({ files: [file], title: fileName });
          } catch (err) {
            if (err instanceof Error && err.name !== "AbortError") throw err;
          }
        } else {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = finalDataUrl;
          link.click();
        }
      } finally {
        hiddenEls.forEach(({ el: e, vis }) => {
          e.style.visibility = vis;
        });
        el.style.transform = prevTransform;
        setTimeout(() => setExportStatus(null), 1500);
      }
      return;
    }

    // ── Desktop / non-iOS path (unchanged) ──────────────────────────────────
    type CanvasReplacement = {
      placeholder: HTMLImageElement;
      canvas: HTMLCanvasElement;
    };
    const canvasReplacements: CanvasReplacement[] = [];
    type ImgRestoration = { img: HTMLImageElement; originalSrc: string };
    const imgRestorations: ImgRestoration[] = [];

    try {
      await Promise.all(
        Array.from(el.querySelectorAll("canvas")).map(async (canvas) => {
          const c = canvas as HTMLCanvasElement;
          const dataUrl = chartSnapshotRef.current
            ? await chartSnapshotRef.current()
            : c.toDataURL("image/png");
          setExportStatus("🖼️ Snapshot grafico acquisito…");
          const img = document.createElement("img");
          img.src = dataUrl;
          img.style.cssText = c.style.cssText;
          img.style.width = `${c.offsetWidth}px`;
          img.style.height = `${c.offsetHeight}px`;
          img.className = c.className;
          await img.decode().catch(() => {});
          c.parentElement?.replaceChild(img, c);
          canvasReplacements.push({ placeholder: img, canvas: c });
        }),
      );

      const imgEls = Array.from(el.querySelectorAll("img"));
      setExportStatus(`🔄 Conversione immagini (0 / ${imgEls.length})…`);
      let converted = 0;
      await Promise.all(
        imgEls.map(async (imgEl) => {
          const img = imgEl as HTMLImageElement;
          const src = img.getAttribute("src") ?? "";
          converted++;
          setExportStatus(
            `🔄 Conversione immagini (${converted} / ${imgEls.length})…`,
          );
          if (!src || src.startsWith("data:")) return;
          const dataUrl = await srcToDataUrl(src);
          if (dataUrl) {
            imgRestorations.push({ img, originalSrc: src });
            img.src = dataUrl;
            await img.decode().catch(() => {});
          }
        }),
      );

      setExportStatus("✏️ Generazione PNG…");
      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        width: EXPORT_SIZE,
        height: EXPORT_SIZE,
        skipFonts: true,
      });

      setExportStatus("✅ Download in corso…");
      const link = document.createElement("a");
      link.download = `${tournamentData.name || "torneo"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      imgRestorations.forEach(({ img, originalSrc }) => {
        img.src = originalSrc;
      });
      canvasReplacements.forEach(({ placeholder, canvas }) => {
        placeholder.parentElement?.replaceChild(canvas, placeholder);
      });
      el.style.transform = prevTransform;
      setTimeout(() => setExportStatus(null), 1500);
    }
  };
  // Build imageSearch overrides map: label → imageSearch term
  const imageSearchOverrides = Object.fromEntries(
    decks
      .filter((d) => d.imageSearch?.trim())
      .map((d) => {
        const label =
          d.name.trim() === "" ? "OTHER" : d.name.trim().toUpperCase();
        return [label, d.imageSearch!.trim()] as const;
      }),
  );

  return (
    <div className="flex flex-col w-full">
      <AppHeader
        onMenuToggle={() => setIsMenuOpen((p) => !p)}
        isMenuOpen={isMenuOpen}
      />

      {/* Mobile backdrop */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <main className="flex h-screen w-full gap-4 p-4 md:gap-8 md:p-8 overflow-hidden">
        {/* Left column — drawer on mobile, static on desktop */}
        <div
          className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl
            flex flex-col gap-8 overflow-y-auto overflow-x-hidden p-4
            transition-transform duration-300
            ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
            md:static md:inset-y-auto md:left-auto md:z-auto md:w-auto
            md:shadow-none md:translate-x-0 md:bg-transparent md:p-0
            md:transition-none
          `}
        >
          <PlayerChart {...playersInfos} />

          <DecksChart
            decks={decks}
            onChange={handleDeckChange}
            onAdd={addDeck}
            onRemove={removeDeck}
            onClear={clearDecks}
          />

          <TournamentChart
            data={tournamentData}
            setField={setTournamentField}
            setLogoUrl={setTournamentLogoUrl}
          />

          <BackgroundImage onImageChange={handleBgChange} />

          <div className="flex flex-col gap-2 p-3">
            <button
              onClick={() => setIsDark((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 w-full justify-center"
            >
              {isDark ? "☀️ Modalità chiara" : "🌙 Modalità notte"}
            </button>
            <button
              onClick={() => setShowTeamInfo((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border w-full justify-center ${
                showTeamInfo
                  ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-gray-300 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {showTeamInfo ? "🏠 Nascondi Team Info" : "🏠 Mostra Team Info"}
            </button>
            <button
              onClick={() => setShowSideChart((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border w-full justify-center ${
                showSideChart
                  ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-gray-300 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {showSideChart ? "📊 Specchietto deck" : "🏷️ Label fette"}
            </button>
            <button
              onClick={exportPng}
              disabled={exportStatus !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬇ Esporta PNG
            </button>
          </div>
        </div>

        {/* Chart preview */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 md:gap-8">
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div
              ref={containerRef}
              className="aspect-square h-full relative overflow-hidden rounded-xl"
            >
              {/* Inner div fixed at EXPORT_SIZE × EXPORT_SIZE, then CSS-scaled to fit.
              Layout size stays 1080px so html-to-image captures exactly 1080×1080.
              Chart.js always renders at 1080px → fonts/padding stay proportional. */}
              <div
                ref={exportRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: EXPORT_SIZE,
                  height: EXPORT_SIZE,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                className={`rounded-xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
              >
                {/* faded background */}
                {bgUrl && (
                  <img
                    src={bgUrl}
                    alt=""
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
                    style={{ opacity: bgOpacity / 100 }}
                  />
                )}

                {/* foreground content */}
                <div className="relative h-full flex flex-col gap-6 p-8">
                  <TournamentInfo
                    data={tournamentData}
                    participants={decks.reduce((sum, d) => sum + d.qty, 0)}
                    isDark={isDark}
                  />
                  <div className="flex-1 min-h-0 relative">
                    <div className="h-full">
                      <PieChart
                        {...chartData}
                        imageSearchOverrides={imageSearchOverrides}
                        isDark={isDark}
                        showLabels={!showSideChart}
                        extraPaddingLeft={showSideChart ? 850 : 0}
                        snapshotRef={chartSnapshotRef}
                      />
                    </div>
                    {showSideChart && (
                      <div className="absolute top-0 left-0 w-1/4">
                        <DecksBarChart {...chartData} isDark={isDark} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 items-stretch w-[90%] mx-auto min-h-[15%] p-8">
                    <div className="flex-[6] min-w-0">
                      <PlayersTop
                        players={playersInfos.players}
                        isDark={isDark}
                      />
                    </div>
                    {showTeamInfo && (
                      <div className="flex-[1] min-w-0">
                        <TeamInfo isDark={isDark} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer — visible only on scroll */}
      <AppFooter />

      {/* Export progress overlay */}
      {exportStatus !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-8 py-6 shadow-2xl">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            <p className="text-sm font-medium text-gray-700">{exportStatus}</p>
          </div>
        </div>
      )}
    </div>
  );
}
