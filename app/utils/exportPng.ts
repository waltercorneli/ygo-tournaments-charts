import { toPng } from "html-to-image";

export const EXPORT_SIZE = 1080;

/** Fetch any URL and return a base64 data URL (or null on failure). */
export async function srcToDataUrl(src: string): Promise<string | null> {
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
}

/** Load an Image from a src, resolve when ready. */
export function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

/** Detect iOS browsers (Safari and Chrome on iOS). */
export function detectIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Polyfill for ctx.roundRect — draws a rounded rectangle path. */
export function roundRectPath(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.arcTo(x + w, y, x + w, y + rr, rr);
  c.lineTo(x + w, y + h - rr);
  c.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  c.lineTo(x + rr, y + h);
  c.arcTo(x, y + h, x, y + h - rr, rr);
  c.lineTo(x, y + rr);
  c.arcTo(x, y, x + rr, y, rr);
  c.closePath();
}

/**
 * Walk up the DOM to find the nearest ancestor that clips via
 * overflow:hidden + border-radius (e.g. the rounded-full logo wrapper).
 * Uses borderTopLeftRadius (more reliable than the shorthand borderRadius).
 */
export function findClipAncestor(
  node: HTMLElement,
  root: HTMLElement,
): { r: DOMRect; radius: number } | null {
  let cur = node.parentElement;
  while (cur && cur !== root) {
    const cs = getComputedStyle(cur);
    if (cs.overflow === "hidden" || cs.overflow === "clip") {
      const br = parseFloat(cs.borderTopLeftRadius);
      if (br > 0) {
        const rect = cur.getBoundingClientRect();
        // Clamp radius to half the smaller dimension (matches browser behaviour)
        const maxR = Math.min(rect.width, rect.height) / 2;
        return { r: rect, radius: Math.min(br, maxR) };
      }
    }
    cur = cur.parentElement;
  }
  return null;
}

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

type BgLayer = { dataUrl: string; opacity: number };

export interface ExportPngOptions {
  exportEl: HTMLDivElement;
  chartSnapshotRef: { current: (() => Promise<string>) | null };
  tournamentName: string;
  setExportStatus: (s: string | null) => void;
  setIosImageUrl: (url: string | null) => void;
}

export async function exportPng({
  exportEl,
  chartSnapshotRef,
  tournamentName,
  setExportStatus,
  setIosImageUrl,
}: ExportPngOptions): Promise<void> {
  const el = exportEl;
  const prevTransform = el.style.transform;

  setExportStatus("⏳ Attesa caricamento grafico…");
  el.style.transform = "scale(1)";

  // iOS Safari/Chrome: WebKit does NOT render <img> inside SVG foreignObject
  // (the mechanism html-to-image uses). Text, borders, bg-colors work fine —
  // only <img> and <canvas> go blank. Fix: capture base layer (text only) via
  // toPng with all images hidden, then composite images manually on a canvas.
  const isIOS = detectIOS();

  if (isIOS) {
    // Wait two frames so layout has settled after the transform change.
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );

    const PR = 2; // 2× is enough for mobile and stays within WebKit canvas limits

    // Background image (aria-hidden) is handled separately so it can be
    // composited at the right z-level (above bg-color, below text/charts).
    let bgLayerData: BgLayer | null = null;
    // layersBelow: drawn BEFORE basePng (artwork images that have a text overlay on top).
    // layersAbove: drawn AFTER  basePng (chart canvas, logos, etc.).
    const layersBelow: Layer[] = [];
    const layersAbove: Layer[] = [];
    const hiddenEls: Array<{ el: HTMLElement; vis: string }> = [];
    const hideEl = (e: HTMLElement) => {
      hiddenEls.push({ el: e, vis: e.style.visibility });
      e.style.visibility = "hidden";
    };

    // Hoisted so finally can restore it even if toPng throws.
    let prevElBg = "";

    try {
      setExportStatus("🖼️ Snapshot grafico…");

      // Capture elRect and ALL child rects in the same synchronous block so
      // every coordinate is measured against the same viewport snapshot.
      const elRect = el.getBoundingClientRect();

      for (const node of Array.from(
        el.querySelectorAll("canvas, img"),
      ) as HTMLElement[]) {
        // --- sync: read rect immediately, NO await yet ---
        const r = node.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;

        if (node instanceof HTMLCanvasElement) {
          // Canvas dataUrl is fetched after the sync rect phase (see below).
          // Push a placeholder with the rect; dataUrl filled in after the loop.
          layersAbove.push({
            dataUrl: "__canvas__",
            objectFit: "fill",
            x: r.left - elRect.left,
            y: r.top - elRect.top,
            w: r.width,
            h: r.height,
          });
          hideEl(node);
        } else {
          const imgEl = node as HTMLImageElement;
          const src = imgEl.getAttribute("src") ?? "";
          if (!src) continue;

          const isAriaHidden = imgEl.getAttribute("aria-hidden") === "true";
          const isBelowClip =
            (imgEl as HTMLImageElement).dataset.exportBelow === "true";
          const objectFit = getComputedStyle(imgEl).objectFit || "fill";
          const opacity = isAriaHidden
            ? parseFloat(getComputedStyle(imgEl).opacity ?? "1")
            : 1;
          const clip = isAriaHidden ? null : findClipAncestor(imgEl, el);

          // Store everything needed to build the layer after the sync phase.
          // We will resolve the dataUrl in the async section below.
          (imgEl as HTMLImageElement & { _exportMeta?: unknown })._exportMeta =
            {
              r,
              src,
              isAriaHidden,
              isBelowClip,
              objectFit,
              opacity: isNaN(opacity) ? 1 : opacity,
              clip,
            };
          hideEl(imgEl);
        }
      }

      // Hide placeholder background divs (data-export-hide) BEFORE toPng.
      for (const node of Array.from(
        el.querySelectorAll<HTMLElement>("[data-export-hide]"),
      )) {
        hideEl(node);
      }

      // --- async: resolve canvas snapshots ---
      for (const layer of layersAbove) {
        if (layer.dataUrl !== "__canvas__") continue;
        try {
          layer.dataUrl = chartSnapshotRef.current
            ? await chartSnapshotRef.current()
            : ""; // canvas node already replaced above; this is a fallback
        } catch {
          /* skip */
        }
        if (!layer.dataUrl || layer.dataUrl.length < 200) layer.dataUrl = "";
      }
      // Drop any canvas layer we failed to capture.
      const validLayersAbove = layersAbove.filter(
        (l) => l.dataUrl !== "" && l.dataUrl !== "__canvas__",
      );
      layersAbove.length = 0;
      validLayersAbove.forEach((l) => layersAbove.push(l));

      // --- async: resolve image dataUrls ---
      for (const imgEl of Array.from(
        el.querySelectorAll<HTMLImageElement & { _exportMeta?: unknown }>(
          "img[src]",
        ),
      )) {
        const meta = (
          imgEl as HTMLImageElement & {
            _exportMeta?: {
              r: DOMRect;
              src: string;
              isAriaHidden: boolean;
              isBelowClip: boolean;
              objectFit: string;
              opacity: number;
              clip: { r: DOMRect; radius: number } | null;
            };
          }
        )._exportMeta;
        if (!meta) continue;
        delete (imgEl as HTMLImageElement & { _exportMeta?: unknown })
          ._exportMeta;

        const { r, src, isAriaHidden, isBelowClip, objectFit, opacity, clip } =
          meta;

        const dataUrl = src.startsWith("data:")
          ? src
          : ((await srcToDataUrl(src)) ?? "");
        if (!dataUrl) continue;

        if (isAriaHidden) {
          bgLayerData = { dataUrl, opacity };
          continue;
        }

        const layerData: Layer = {
          dataUrl,
          objectFit,
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
        };

        if (isBelowClip) {
          layersBelow.push(layerData);
        } else {
          layersAbove.push(layerData);
        }
      }

      // 2. Capture the visible DOM (text, gradients, UI) with all images hidden.
      setExportStatus("✏️ Generazione base…");
      const elBgColor = getComputedStyle(el).backgroundColor;
      prevElBg = el.style.backgroundColor;
      el.style.backgroundColor = "transparent";
      const basePng = await toPng(el, {
        pixelRatio: PR,
        width: EXPORT_SIZE,
        height: EXPORT_SIZE,
        skipFonts: true,
        backgroundColor: "rgba(0,0,0,0)",
      });
      el.style.backgroundColor = prevElBg;

      // 3. Composite everything on a single canvas.
      setExportStatus("🎨 Composizione immagine…");
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = EXPORT_SIZE * PR;
      finalCanvas.height = EXPORT_SIZE * PR;
      const ctx = finalCanvas.getContext("2d")!;

      // Step A: solid background colour
      ctx.fillStyle = elBgColor;
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Step B: background image with correct CSS opacity (behind text)
      if (bgLayerData) {
        const bgImg = await loadImg(bgLayerData.dataUrl);
        ctx.globalAlpha = bgLayerData.opacity;
        ctx.drawImage(bgImg, 0, 0, finalCanvas.width, finalCanvas.height);
        ctx.globalAlpha = 1;
      }

      // Helper: draw a Layer onto ctx respecting clip + objectFit.
      const drawLayer = async (layer: Layer) => {
        const img = await loadImg(layer.dataUrl);
        const dx = layer.x * PR;
        const dy = layer.y * PR;
        const dw = layer.w * PR;
        const dh = layer.h * PR;

        ctx.save();

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
          roundRectPath(ctx, cx, cy, cw, ch, cr);
          ctx.fillStyle = "#000000";
          ctx.fill();
          roundRectPath(ctx, cx, cy, cw, ch, cr);
          ctx.clip();
        }

        if (layer.objectFit === "cover") {
          const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight);
          const sw = dw / scale;
          const sh = dh / scale;
          const sx = (img.naturalWidth - sw) / 2;
          const sy = (img.naturalHeight - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        } else if (layer.objectFit === "contain") {
          const scale = Math.min(dw / img.naturalWidth, dh / img.naturalHeight);
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
      };

      // Step C: artwork images beneath text overlays (drawn BEFORE basePng)
      for (const layer of layersBelow) {
        try {
          await drawLayer(layer);
        } catch {
          /* skip */
        }
      }

      // Step D: text / UI elements
      ctx.drawImage(
        await loadImg(basePng),
        0,
        0,
        finalCanvas.width,
        finalCanvas.height,
      );

      // Step E: canvas snapshot + logos (drawn AFTER basePng, on top of text)
      for (const layer of layersAbove) {
        try {
          await drawLayer(layer);
        } catch {
          /* skip */
        }
      }

      setExportStatus("✅ Download in corso…");
      setIosImageUrl(finalCanvas.toDataURL("image/png"));
    } catch (err) {
      throw err;
    } finally {
      hiddenEls.forEach(({ el: e, vis }) => {
        e.style.visibility = vis;
      });
      el.style.backgroundColor = prevElBg;
      el.style.transform = prevTransform;
      setTimeout(() => setExportStatus(null), 1500);
    }
    return;
  }

  // ── Desktop / non-iOS path ───────────────────────────────────────────────
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
    link.download = `${tournamentName || "torneo"}.png`;
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
}
