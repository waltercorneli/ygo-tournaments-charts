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

    const elRect = el.getBoundingClientRect();
    const PR = 2; // 2× is enough for mobile and stays within WebKit canvas limits

    // Background image (aria-hidden) is handled separately so it can be
    // composited at the right z-level (above bg-color, below text/charts).
    let bgLayerData: BgLayer | null = null;
    const layers: Layer[] = [];
    const hiddenEls: Array<{ el: HTMLElement; vis: string }> = [];
    const hideEl = (e: HTMLElement) => {
      hiddenEls.push({ el: e, vis: e.style.visibility });
      e.style.visibility = "hidden";
    };

    // Hoisted so finally can restore it even if toPng throws.
    let prevElBg = "";

    try {
      setExportStatus("🖼️ Snapshot grafico…");

      // Collect canvas + img layers in DOM order so the background image
      // (which appears before the canvas in the DOM) is composited first.
      for (const node of Array.from(
        el.querySelectorAll("canvas, img"),
      ) as HTMLElement[]) {
        const r = node.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;

        let dataUrl = "";

        if (node instanceof HTMLCanvasElement) {
          try {
            dataUrl = chartSnapshotRef.current
              ? await chartSnapshotRef.current()
              : node.toDataURL("image/png");
          } catch {
            /* tainted — skip */
          }
          if (!dataUrl || dataUrl.length < 200) continue;
          layers.push({
            dataUrl,
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
          dataUrl = src.startsWith("data:")
            ? src
            : ((await srcToDataUrl(src)) ?? "");
          if (!dataUrl) continue;

          // Background image is the aria-hidden decorative img — treat it
          // separately so it composites BEHIND text but ABOVE the solid
          // background colour (and with the correct CSS opacity applied).
          if (imgEl.getAttribute("aria-hidden") === "true") {
            const opacity = parseFloat(getComputedStyle(imgEl).opacity ?? "1");
            bgLayerData = { dataUrl, opacity: isNaN(opacity) ? 1 : opacity };
            hideEl(imgEl);
            continue;
          }

          const clip = findClipAncestor(imgEl, el);
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
      }

      // 2. Capture the DOM (text, UI elements) with all images hidden.
      // Temporarily clear the element's inline background so the toPng output
      // has a transparent backing — the solid colour will be filled manually
      // on the canvas, and the bg image is composited on top of it.
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

      // Step A: solid background colour (replaces the Tailwind bg-* class)
      ctx.fillStyle = elBgColor;
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Step B: background image with correct CSS opacity (behind text)
      if (bgLayerData) {
        const bgImg = await loadImg(bgLayerData.dataUrl);
        ctx.globalAlpha = bgLayerData.opacity;
        ctx.drawImage(bgImg, 0, 0, finalCanvas.width, finalCanvas.height);
        ctx.globalAlpha = 1;
      }

      // Step C: text / UI elements (transparent base layer goes on top of bg image)
      ctx.drawImage(
        await loadImg(basePng),
        0,
        0,
        finalCanvas.width,
        finalCanvas.height,
      );

      // Step D: canvas snapshots + logo images in DOM order (on top of text)
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
            roundRectPath(ctx, cx, cy, cw, ch, cr);
            // Fill with black first so no white bleeds through from the base layer.
            ctx.fillStyle = "#000000";
            ctx.fill();
            roundRectPath(ctx, cx, cy, cw, ch, cr);
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

      // Show the image in the in-page modal — works on every iOS browser.
      // The user long-presses the image to save it.
      setIosImageUrl(finalDataUrl);
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
