// Core data model. Pure TypeScript, no DOM or canvas dependencies.

export type ElementType = 'text' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'star' | 'image';
export type TextAlign = 'left' | 'center' | 'right';

interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  fill: string;
  align: TextAlign;
  width: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface StarElement extends BaseElement {
  type: 'star';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  numPoints: number;
  innerRatio: number;
}

export interface LineElement extends BaseElement {
  type: 'line' | 'arrow';
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
}

export type DesignElement =
  | TextElement
  | RectElement
  | EllipseElement
  | StarElement
  | LineElement
  | ImageElement;

export interface Page {
  id: string;
  background: string;
  elements: DesignElement[];
}

export interface Design {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  pages: Page[];
  createdAt: number;
  updatedAt: number;
}

export const FONT_FAMILIES = [
  'Geist',
  'Geist Mono',
  'Inter',
  'Space Grotesk',
  'Montserrat',
  'Poppins',
  'Oswald',
  'Bebas Neue',
  'Playfair Display',
  'DM Serif Display',
  'Lora',
  'JetBrains Mono',
] as const;

export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

let counter = 0;
export function uid(prefix = 'el'): string {
  counter = (counter + 1) % 1e6;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

function base(type: ElementType, name: string): BaseElement {
  return { id: uid(), type, name, x: 0, y: 0, rotation: 0, opacity: 1, visible: true, locked: false };
}

export function createText(p: Partial<TextElement> = {}): TextElement {
  return {
    ...base('text', 'Text'),
    text: 'Your text here',
    fontFamily: 'Geist',
    fontSize: 48,
    fontWeight: 400,
    italic: false,
    fill: '#0A0A0A',
    align: 'left',
    width: 600,
    lineHeight: 1.2,
    letterSpacing: 0,
    ...p,
    type: 'text',
  };
}

export function createRect(p: Partial<RectElement> = {}): RectElement {
  return {
    ...base('rect', 'Rectangle'),
    width: 300,
    height: 200,
    fill: '#0A0A0A',
    stroke: '#0A0A0A',
    strokeWidth: 0,
    cornerRadius: 0,
    ...p,
    type: 'rect',
  };
}

export function createEllipse(p: Partial<EllipseElement> = {}): EllipseElement {
  return {
    ...base('ellipse', 'Circle'),
    width: 240,
    height: 240,
    fill: '#FFD60A',
    stroke: '#0A0A0A',
    strokeWidth: 0,
    ...p,
    type: 'ellipse',
  };
}

export function createStar(p: Partial<StarElement> = {}): StarElement {
  return {
    ...base('star', 'Star'),
    width: 240,
    height: 240,
    fill: '#FFD60A',
    stroke: '#0A0A0A',
    strokeWidth: 0,
    numPoints: 5,
    innerRatio: 0.45,
    ...p,
    type: 'star',
  };
}

export function createLine(p: Partial<LineElement> = {}, type: 'line' | 'arrow' = 'line'): LineElement {
  return {
    ...base(type, type === 'arrow' ? 'Arrow' : 'Line'),
    points: [0, 0, 300, 0],
    stroke: '#0A0A0A',
    strokeWidth: 6,
    ...p,
    type,
  };
}

export function createImage(p: Partial<ImageElement> & { src: string }): ImageElement {
  return {
    ...base('image', 'Image'),
    width: 400,
    height: 300,
    ...p,
    type: 'image',
  };
}

export function createPage(background = '#FFFFFF', elements: DesignElement[] = []): Page {
  return { id: uid('page'), background, elements };
}

export function createDesign(width: number, height: number, name = 'Untitled design'): Design {
  const now = Date.now();
  return {
    version: 1,
    id: uid('design'),
    name,
    width: Math.round(width),
    height: Math.round(height),
    pages: [createPage()],
    createdAt: now,
    updatedAt: now,
  };
}

/** Approximate axis-aligned size of an element (ignores rotation). */
export function elementSize(el: DesignElement): { width: number; height: number } {
  switch (el.type) {
    case 'line':
    case 'arrow':
      return { width: Math.abs(el.points[2] - el.points[0]), height: Math.abs(el.points[3] - el.points[1]) };
    case 'text':
      return { width: el.width, height: el.fontSize * el.lineHeight * Math.max(1, el.text.split('\n').length) };
    default:
      return { width: el.width, height: el.height };
  }
}
