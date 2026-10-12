// Serialization: stable JSON file format with validation and default-filling on import.
import {
  type Design,
  type DesignElement,
  type ElementType,
  type Page,
  createEllipse,
  createImage,
  createLine,
  createRect,
  createStar,
  createText,
  uid,
} from './model';

export const FILE_FORMAT = 'openworld-studio';
export const FILE_VERSION = 1;

export interface DesignFile {
  format: typeof FILE_FORMAT;
  version: number;
  design: Design;
}

export class DesignParseError extends Error {}

const ELEMENT_TYPES: ElementType[] = ['text', 'rect', 'ellipse', 'line', 'arrow', 'star', 'image'];

export function serializeDesign(design: Design, pretty = false): string {
  const file: DesignFile = { format: FILE_FORMAT, version: FILE_VERSION, design };
  return JSON.stringify(file, null, pretty ? 2 : undefined);
}

/** A canonical snapshot of the editable content, used by the undo stack. */
export function snapshotDesign(design: Design): string {
  return JSON.stringify({ name: design.name, width: design.width, height: design.height, pages: design.pages });
}

export function restoreSnapshot(design: Design, snapshot: string): Design {
  const s = JSON.parse(snapshot) as Pick<Design, 'name' | 'width' | 'height' | 'pages'>;
  return { ...design, name: s.name, width: s.width, height: s.height, pages: s.pages };
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string): string => (typeof v === 'string' ? v : d);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);

function pickKnown<T extends object>(defaults: T, raw: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const key of Object.keys(defaults)) {
    const dv = (defaults as Record<string, unknown>)[key];
    const rv = raw[key];
    if (rv === undefined) continue;
    if (typeof dv === 'number') out[key] = num(rv, dv);
    else if (typeof dv === 'string') out[key] = str(rv, dv);
    else if (typeof dv === 'boolean') out[key] = bool(rv, dv);
    else if (Array.isArray(dv)) {
      if (Array.isArray(rv) && rv.length === dv.length && rv.every((n) => typeof n === 'number')) out[key] = rv;
    }
  }
  return out as T;
}

export function normalizeElement(raw: unknown): DesignElement {
  if (!raw || typeof raw !== 'object') throw new DesignParseError('Element is not an object');
  const r = raw as Record<string, unknown>;
  const type = r.type as ElementType;
  if (!ELEMENT_TYPES.includes(type)) throw new DesignParseError(`Unknown element type: ${String(r.type)}`);
  let el: DesignElement;
  switch (type) {
    case 'text':
      el = pickKnown(createText(), r);
      break;
    case 'rect':
      el = pickKnown(createRect(), r);
      break;
    case 'ellipse':
      el = pickKnown(createEllipse(), r);
      break;
    case 'star':
      el = pickKnown(createStar(), r);
      break;
    case 'line':
    case 'arrow':
      el = pickKnown(createLine({}, type), r);
      break;
    case 'image':
      if (typeof r.src !== 'string' || !r.src) throw new DesignParseError('Image element without src');
      el = pickKnown(createImage({ src: r.src }), r);
      break;
  }
  if (typeof r.id !== 'string' || !r.id) el.id = uid();
  if (el.type === 'text' && !['left', 'center', 'right'].includes(el.align)) el.align = 'left';
  el.opacity = Math.max(0, Math.min(1, el.opacity));
  return el;
}

function normalizePage(raw: unknown): Page {
  if (!raw || typeof raw !== 'object') throw new DesignParseError('Page is not an object');
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.elements)) throw new DesignParseError('Page has no elements array');
  const elements = r.elements.map(normalizeElement);
  // Guarantee unique element ids within the page.
  const seen = new Set<string>();
  for (const el of elements) {
    if (seen.has(el.id)) el.id = uid();
    seen.add(el.id);
  }
  return { id: str(r.id, '') || uid('page'), background: str(r.background, '#FFFFFF'), elements };
}

export function normalizeDesign(raw: unknown): Design {
  if (!raw || typeof raw !== 'object') throw new DesignParseError('Design is not an object');
  const r = raw as Record<string, unknown>;
  const width = num(r.width, NaN);
  const height = num(r.height, NaN);
  if (!(width > 0 && height > 0)) throw new DesignParseError('Design needs a positive width and height');
  if (!Array.isArray(r.pages) || r.pages.length === 0) throw new DesignParseError('Design needs at least one page');
  const now = Date.now();
  return {
    version: 1,
    id: str(r.id, '') || uid('design'),
    name: str(r.name, 'Untitled design'),
    width,
    height,
    pages: r.pages.map(normalizePage),
    createdAt: num(r.createdAt, now),
    updatedAt: num(r.updatedAt, now),
  };
}

/** Parses a design file (or a bare design object) from a JSON string. */
export function parseDesign(json: string): Design {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new DesignParseError('File is not valid JSON');
  }
  if (data && typeof data === 'object' && (data as DesignFile).format === FILE_FORMAT) {
    const f = data as DesignFile;
    if (typeof f.version !== 'number' || f.version > FILE_VERSION) {
      throw new DesignParseError(`Unsupported file version: ${String(f.version)}`);
    }
    return normalizeDesign(f.design);
  }
  return normalizeDesign(data);
}
