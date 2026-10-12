// Canvas size presets and original templates built only from shapes and text.
import {
  type Design,
  type DesignElement,
  createDesign,
  createEllipse,
  createLine,
  createPage,
  createRect,
  createStar,
  createText,
} from './model';

export interface SizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'square', label: 'Square post', width: 1080, height: 1080 },
  { id: 'story', label: 'Story', width: 1080, height: 1920 },
  { id: 'a4', label: 'A4 portrait', width: 794, height: 1123 },
  { id: 'slide', label: 'Presentation', width: 1920, height: 1080 },
  { id: 'thumb', label: 'Video thumbnail', width: 1280, height: 720 },
  { id: 'card', label: 'Business card', width: 1050, height: 600 },
];

export interface Template {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  pages: Array<{ background: string; elements: () => DesignElement[] }>;
}

const INK = '#0A0A0A';
const SUN = '#FFD60A';
const PAPER = '#FFFFFF';

export const TEMPLATES: Template[] = [
  {
    id: 'event-poster',
    name: 'Launch night poster',
    category: 'Poster',
    width: 794,
    height: 1123,
    pages: [
      {
        background: INK,
        elements: () => [
          createEllipse({ name: 'Sun disc', x: 430, y: -140, width: 520, height: 520, fill: SUN }),
          createLine({ name: 'Rule top', x: 60, y: 470, points: [0, 0, 674, 0], stroke: '#3A3A3A', strokeWidth: 2 }),
          createText({ name: 'Kicker', x: 60, y: 80, width: 360, text: 'OPEN SOURCE MEETUP\nVOL. 07', fontFamily: 'Geist Mono', fontSize: 22, fontWeight: 500, fill: PAPER, lineHeight: 1.5, letterSpacing: 2 }),
          createText({ name: 'Title', x: 56, y: 500, width: 690, text: 'LAUNCH\nNIGHT', fontFamily: 'Bebas Neue', fontSize: 230, fill: PAPER, lineHeight: 0.88 }),
          createText({ name: 'Subtitle', x: 60, y: 920, width: 420, text: 'An evening of live demos, short talks and cold drinks with people who ship.', fontFamily: 'Geist', fontSize: 24, fill: '#BDBDBD', lineHeight: 1.4 }),
          createText({ name: 'Date', x: 520, y: 920, width: 214, text: 'FRI 14 NOV\n19:00 to late', fontFamily: 'Geist Mono', fontSize: 22, fontWeight: 600, fill: SUN, align: 'right', lineHeight: 1.5 }),
          createText({ name: 'Venue', x: 520, y: 1010, width: 214, text: 'Pier 21, Harbour Hall', fontFamily: 'Geist', fontSize: 18, fill: PAPER, align: 'right' }),
          createStar({ name: 'Spark', x: 60, y: 390, width: 48, height: 48, fill: SUN, numPoints: 4, innerRatio: 0.25 }),
        ],
      },
    ],
  },
  {
    id: 'sale-post',
    name: 'Weekend sale post',
    category: 'Social',
    width: 1080,
    height: 1080,
    pages: [
      {
        background: SUN,
        elements: () => [
          createRect({ name: 'Frame', x: 40, y: 40, width: 1000, height: 1000, fill: 'rgba(0,0,0,0)', stroke: INK, strokeWidth: 4, cornerRadius: 0 }),
          createText({ name: 'Label', x: 90, y: 100, width: 900, text: 'WEEKEND ONLY', fontFamily: 'Geist Mono', fontSize: 32, fontWeight: 600, fill: INK, letterSpacing: 6 }),
          createText({ name: 'Discount', x: 80, y: 190, width: 940, text: '40% OFF', fontFamily: 'Oswald', fontSize: 240, fontWeight: 700, fill: INK, lineHeight: 1 }),
          createText({ name: 'Detail', x: 90, y: 520, width: 600, text: 'Every chair, lamp and side table in the shop. No codes, no catch.', fontFamily: 'Geist', fontSize: 40, fill: INK, lineHeight: 1.3 }),
          createRect({ name: 'Button', x: 90, y: 820, width: 380, height: 110, fill: INK, cornerRadius: 55 }),
          createText({ name: 'Button label', x: 90, y: 855, width: 380, text: 'Shop the sale', fontFamily: 'Geist', fontSize: 38, fontWeight: 600, fill: SUN, align: 'center' }),
          createStar({ name: 'Badge', x: 760, y: 700, width: 240, height: 240, fill: INK, numPoints: 12, innerRatio: 0.8 }),
          createText({ name: 'Badge text', x: 760, y: 785, width: 240, text: 'SAT\nSUN', fontFamily: 'Geist Mono', fontSize: 30, fontWeight: 700, fill: SUN, align: 'center', lineHeight: 1.1 }),
        ],
      },
    ],
  },
  {
    id: 'quote-card',
    name: 'Quote card',
    category: 'Social',
    width: 1080,
    height: 1080,
    pages: [
      {
        background: '#F3F0E8',
        elements: () => [
          createText({ name: 'Quote mark', x: 100, y: 70, width: 300, text: '\u201C', fontFamily: 'DM Serif Display', fontSize: 320, fill: INK, lineHeight: 1 }),
          createText({ name: 'Quote', x: 100, y: 360, width: 860, text: 'Build the simple version first. Then make it good. Then make it yours.', fontFamily: 'Playfair Display', fontSize: 68, fontWeight: 500, italic: true, fill: INK, lineHeight: 1.25 }),
          createLine({ name: 'Rule', x: 100, y: 860, points: [0, 0, 120, 0], stroke: INK, strokeWidth: 4 }),
          createText({ name: 'Author', x: 100, y: 890, width: 700, text: 'From the studio notebook', fontFamily: 'Geist Mono', fontSize: 28, fill: '#555555' }),
          createEllipse({ name: 'Dot', x: 900, y: 880, width: 80, height: 80, fill: SUN }),
        ],
      },
    ],
  },
  {
    id: 'title-slide',
    name: 'Presentation title slide',
    category: 'Presentation',
    width: 1920,
    height: 1080,
    pages: [
      {
        background: PAPER,
        elements: () => [
          createRect({ name: 'Side bar', x: 0, y: 0, width: 120, height: 1080, fill: INK }),
          createRect({ name: 'Accent', x: 220, y: 300, width: 140, height: 18, fill: SUN }),
          createText({ name: 'Section', x: 220, y: 200, width: 800, text: '01 / OVERVIEW', fontFamily: 'Geist Mono', fontSize: 30, fontWeight: 500, fill: '#6B6B6B', letterSpacing: 3 }),
          createText({ name: 'Title', x: 214, y: 370, width: 1640, text: 'Quarterly product review', fontFamily: 'Geist', fontSize: 112, fontWeight: 700, fill: INK, lineHeight: 1.05, letterSpacing: -3 }),
          createText({ name: 'Subtitle', x: 220, y: 560, width: 1200, text: 'What we shipped, what we learned and where we go next.', fontFamily: 'Geist', fontSize: 44, fill: '#3A3A3A', lineHeight: 1.3 }),
          createLine({ name: 'Hairline', x: 220, y: 900, points: [0, 0, 1580, 0], stroke: '#EBEBEB', strokeWidth: 2 }),
          createText({ name: 'Footer left', x: 220, y: 930, width: 800, text: 'Product and Design team', fontFamily: 'Geist Mono', fontSize: 26, fill: INK }),
          createText({ name: 'Footer right', x: 1000, y: 930, width: 800, text: 'Q3 2026', fontFamily: 'Geist Mono', fontSize: 26, fill: INK, align: 'right' }),
        ],
      },
      {
        background: PAPER,
        elements: () => [
          createRect({ name: 'Side bar', x: 0, y: 0, width: 120, height: 1080, fill: INK }),
          createText({ name: 'Section', x: 220, y: 140, width: 800, text: '02 / HIGHLIGHTS', fontFamily: 'Geist Mono', fontSize: 30, fontWeight: 500, fill: '#6B6B6B', letterSpacing: 3 }),
          createText({ name: 'Heading', x: 216, y: 210, width: 1400, text: 'Three things that moved the needle', fontFamily: 'Geist', fontSize: 72, fontWeight: 700, fill: INK, letterSpacing: -1 }),
          createRect({ name: 'Card 1', x: 220, y: 420, width: 500, height: 420, fill: '#F6F6F6', cornerRadius: 16 }),
          createRect({ name: 'Card 2', x: 760, y: 420, width: 500, height: 420, fill: '#F6F6F6', cornerRadius: 16 }),
          createRect({ name: 'Card 3', x: 1300, y: 420, width: 500, height: 420, fill: SUN, cornerRadius: 16 }),
          createText({ name: 'Stat 1', x: 260, y: 460, width: 420, text: '2.4x\nfaster onboarding', fontFamily: 'Geist', fontSize: 52, fontWeight: 600, fill: INK, lineHeight: 1.2 }),
          createText({ name: 'Stat 2', x: 800, y: 460, width: 420, text: '18\nnew integrations', fontFamily: 'Geist', fontSize: 52, fontWeight: 600, fill: INK, lineHeight: 1.2 }),
          createText({ name: 'Stat 3', x: 1340, y: 460, width: 420, text: '-31%\nsupport tickets', fontFamily: 'Geist', fontSize: 52, fontWeight: 600, fill: INK, lineHeight: 1.2 }),
        ],
      },
    ],
  },
  {
    id: 'business-card',
    name: 'Business card',
    category: 'Print',
    width: 1050,
    height: 600,
    pages: [
      {
        background: PAPER,
        elements: () => [
          createEllipse({ name: 'Mark', x: 80, y: 80, width: 90, height: 90, fill: SUN }),
          createRect({ name: 'Mark cut', x: 125, y: 80, width: 45, height: 45, fill: INK }),
          createText({ name: 'Name', x: 80, y: 300, width: 600, text: 'Sam Rivera', fontFamily: 'Geist', fontSize: 64, fontWeight: 700, fill: INK, letterSpacing: -1 }),
          createText({ name: 'Role', x: 80, y: 380, width: 600, text: 'Independent product designer', fontFamily: 'Geist', fontSize: 30, fill: '#555555' }),
          createLine({ name: 'Divider', x: 80, y: 460, points: [0, 0, 890, 0], stroke: '#EBEBEB', strokeWidth: 2 }),
          createText({ name: 'Contact', x: 80, y: 490, width: 520, text: 'sam@example.com\n+31 6 0000 0000', fontFamily: 'Geist Mono', fontSize: 24, fill: INK, lineHeight: 1.5 }),
          createText({ name: 'Web', x: 570, y: 490, width: 400, text: 'samrivera.example\nRotterdam, NL', fontFamily: 'Geist Mono', fontSize: 24, fill: INK, align: 'right', lineHeight: 1.5 }),
        ],
      },
      {
        background: INK,
        elements: () => [
          createEllipse({ name: 'Mark', x: 450, y: 225, width: 150, height: 150, fill: SUN }),
          createRect({ name: 'Mark cut', x: 525, y: 225, width: 75, height: 75, fill: INK }),
        ],
      },
    ],
  },
  {
    id: 'video-thumbnail',
    name: 'Video thumbnail',
    category: 'Video',
    width: 1280,
    height: 720,
    pages: [
      {
        background: '#13213C',
        elements: () => [
          createRect({ name: 'Panel', x: 760, y: 0, width: 520, height: 720, fill: SUN }),
          createEllipse({ name: 'Ring', x: 840, y: 160, width: 400, height: 400, fill: 'rgba(0,0,0,0)', stroke: INK, strokeWidth: 18 }),
          createText({ name: 'Number', x: 840, y: 250, width: 400, text: '5', fontFamily: 'Bebas Neue', fontSize: 260, fill: INK, align: 'center', lineHeight: 0.85 }),
          createText({ name: 'Headline', x: 60, y: 110, width: 660, text: 'TOOLS I\nUSE EVERY\nSINGLE DAY', fontFamily: 'Bebas Neue', fontSize: 150, fill: PAPER, lineHeight: 0.9 }),
          createArrow(),
          createRect({ name: 'Tag', x: 60, y: 600, width: 230, height: 64, fill: SUN, cornerRadius: 8 }),
          createText({ name: 'Tag text', x: 60, y: 616, width: 230, text: 'NEW VIDEO', fontFamily: 'Geist Mono', fontSize: 28, fontWeight: 700, fill: INK, align: 'center' }),
        ],
      },
    ],
  },
  {
    id: 'story-announcement',
    name: 'Studio open day story',
    category: 'Social',
    width: 1080,
    height: 1920,
    pages: [
      {
        background: PAPER,
        elements: () => [
          createRect({ name: 'Top block', x: 0, y: 0, width: 1080, height: 980, fill: SUN }),
          createStar({ name: 'Burst', x: 620, y: 140, width: 360, height: 360, fill: INK, numPoints: 8, innerRatio: 0.55 }),
          createText({ name: 'Kicker', x: 90, y: 160, width: 500, text: 'YOU ARE INVITED', fontFamily: 'Geist Mono', fontSize: 36, fontWeight: 600, fill: INK, letterSpacing: 4 }),
          createText({ name: 'Title', x: 84, y: 560, width: 920, text: 'Open\nstudio day', fontFamily: 'Geist', fontSize: 170, fontWeight: 800, fill: INK, lineHeight: 0.95, letterSpacing: -6 }),
          createText({ name: 'Body', x: 90, y: 1080, width: 900, text: 'Walk in, see work in progress, try the prototypes and meet the team behind them.', fontFamily: 'Geist', fontSize: 52, fill: INK, lineHeight: 1.3 }),
          createLine({ name: 'Rule', x: 90, y: 1460, points: [0, 0, 900, 0], stroke: '#EBEBEB', strokeWidth: 3 }),
          createText({ name: 'When', x: 90, y: 1510, width: 440, text: 'SATURDAY\n11:00 to 17:00', fontFamily: 'Geist Mono', fontSize: 40, fontWeight: 600, fill: INK, lineHeight: 1.4 }),
          createText({ name: 'Where', x: 550, y: 1510, width: 440, text: 'Unit 4B\nCanal Works', fontFamily: 'Geist Mono', fontSize: 40, fontWeight: 600, fill: INK, align: 'right', lineHeight: 1.4 }),
          createRect({ name: 'Swipe pill', x: 340, y: 1740, width: 400, height: 90, fill: INK, cornerRadius: 45 }),
          createText({ name: 'Swipe text', x: 340, y: 1765, width: 400, text: 'Save the date', fontFamily: 'Geist', fontSize: 36, fontWeight: 600, fill: PAPER, align: 'center' }),
        ],
      },
    ],
  },
];

function createArrow() {
  return createLine({ name: 'Pointer', x: 560, y: 360, points: [0, 0, 240, 0], stroke: PAPER, strokeWidth: 16 }, 'arrow');
}

export function designFromTemplate(t: Template): Design {
  const d = createDesign(t.width, t.height, t.name);
  d.pages = t.pages.map((p) => createPage(p.background, p.elements()));
  return d;
}

export function designFromSize(width: number, height: number, name = 'Untitled design'): Design {
  const w = Math.max(16, Math.min(8000, Math.round(width)));
  const h = Math.max(16, Math.min(8000, Math.round(height)));
  return createDesign(w, h, name);
}

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
