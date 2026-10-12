// Konva rendering of the data model. Shared by the interactive editor and offscreen export.
import Konva from 'konva';
import type { Design, DesignElement, Page, TextElement } from '../core/model';

// ---------- images ----------
const imageCache = new Map<string, HTMLImageElement>();
const imageWaiters = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete) return Promise.resolve(cached);
  const pending = imageWaiters.get(src);
  if (pending) return pending;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = src;
  });
  imageWaiters.set(src, p);
  return p;
}

export function getLoadedImage(src: string): HTMLImageElement | undefined {
  const img = imageCache.get(src);
  return img && img.complete ? img : undefined;
}

// ---------- fonts ----------
const loadedFonts = new Set<string>();

export function fontStyle(el: TextElement): string {
  return `${el.italic ? 'italic ' : ''}${el.fontWeight}`;
}

function fontSpecs(pages: Page[]): string[] {
  const specs = new Set<string>();
  for (const p of pages)
    for (const el of p.elements)
      if (el.type === 'text') specs.add(`${el.italic ? 'italic ' : ''}${el.fontWeight} 32px "${el.fontFamily}"`);
  return [...specs];
}

/** Loads all web fonts used by the given pages. Resolves true when new fonts were loaded. */
export async function ensureFonts(pages: Page[]): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return false;
  const missing = fontSpecs(pages).filter((s) => !loadedFonts.has(s));
  if (!missing.length) return false;
  await Promise.all(
    missing.map((s) =>
      document.fonts
        .load(s)
        .catch(() => undefined)
        .then(() => loadedFonts.add(s)),
    ),
  );
  return true;
}

export async function ensureAssets(pages: Page[]): Promise<void> {
  const imgs: Promise<unknown>[] = [];
  for (const p of pages)
    for (const el of p.elements) if (el.type === 'image') imgs.push(loadImage(el.src).catch(() => undefined));
  await Promise.all([ensureFonts(pages), ...imgs]);
}

// ---------- nodes ----------
export function createNode(el: DesignElement): Konva.Shape {
  const common = {
    id: el.id,
    name: 'element',
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    visible: el.visible,
  };
  switch (el.type) {
    case 'text':
      return new Konva.Text({
        ...common,
        text: el.text,
        fontFamily: `${el.fontFamily}, sans-serif`,
        fontSize: el.fontSize,
        fontStyle: fontStyle(el),
        fill: el.fill,
        align: el.align,
        width: el.width,
        lineHeight: el.lineHeight,
        letterSpacing: el.letterSpacing,
        wrap: 'word',
      });
    case 'rect':
      return new Konva.Rect({
        ...common,
        width: el.width,
        height: el.height,
        fill: el.fill,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        strokeEnabled: el.strokeWidth > 0,
        cornerRadius: el.cornerRadius,
      });
    case 'ellipse':
      return new Konva.Ellipse({
        ...common,
        radiusX: el.width / 2,
        radiusY: el.height / 2,
        offsetX: -el.width / 2,
        offsetY: -el.height / 2,
        fill: el.fill,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        strokeEnabled: el.strokeWidth > 0,
      });
    case 'star':
      return new Konva.Star({
        ...common,
        numPoints: el.numPoints,
        outerRadius: 50,
        innerRadius: 50 * el.innerRatio,
        scaleX: el.width / 100,
        scaleY: el.height / 100,
        offsetX: -50,
        offsetY: -50,
        fill: el.fill,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        strokeEnabled: el.strokeWidth > 0,
        strokeScaleEnabled: false,
      });
    case 'line':
    case 'arrow': {
      const cfg = {
        ...common,
        points: [...el.points],
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        hitStrokeWidth: Math.max(20, el.strokeWidth + 12),
      };
      return el.type === 'arrow'
        ? new Konva.Arrow({ ...cfg, fill: el.stroke, pointerLength: el.strokeWidth * 3, pointerWidth: el.strokeWidth * 3 })
        : new Konva.Line(cfg);
    }
    case 'image':
      return new Konva.Image({ ...common, image: getLoadedImage(el.src), width: el.width, height: el.height });
  }
}

/** Reads a node's geometry back into a patch for the model, normalising scale away. */
export function readNodeGeometry(node: Konva.Node, el: DesignElement): Partial<DesignElement> {
  const sx = node.scaleX();
  const sy = node.scaleY();
  const base = { x: node.x(), y: node.y(), rotation: node.rotation() };
  switch (el.type) {
    case 'text': {
      const scaledFont = Math.abs(sy - 1) > 0.001;
      return {
        ...base,
        width: Math.max(20, node.width() * sx),
        fontSize: scaledFont ? Math.max(4, Math.round(el.fontSize * sy * 10) / 10) : el.fontSize,
      };
    }
    case 'star':
      return { ...base, width: Math.max(4, sx * 100), height: Math.max(4, sy * 100) };
    case 'line':
    case 'arrow': {
      const p = el.points;
      return { ...base, points: [p[0] * sx, p[1] * sy, p[2] * sx, p[3] * sy] };
    }
    default:
      return { ...base, width: Math.max(4, el.width * sx), height: Math.max(4, el.height * sy) };
  }
}

export function populateLayer(layer: Konva.Layer, design: Design, page: Page): Konva.Rect {
  const bg = new Konva.Rect({ x: 0, y: 0, width: design.width, height: design.height, fill: page.background, name: 'background' });
  layer.add(bg);
  for (const el of page.elements) layer.add(createNode(el));
  return bg;
}

/** Renders a page offscreen at the given pixel ratio and returns a data URL. */
export async function renderPageToDataURL(
  design: Design,
  pageIndex: number,
  opts: { pixelRatio?: number; mimeType?: string; quality?: number } = {},
): Promise<string> {
  const page = design.pages[pageIndex];
  await ensureAssets([page]);
  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: design.width, height: design.height });
  const layer = new Konva.Layer();
  stage.add(layer);
  populateLayer(layer, design, page);
  layer.draw();
  const url = stage.toDataURL({
    pixelRatio: opts.pixelRatio ?? 2,
    mimeType: opts.mimeType ?? 'image/png',
    quality: opts.quality ?? 0.92,
  });
  stage.destroy();
  return url;
}
