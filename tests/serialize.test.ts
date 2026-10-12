import { describe, expect, it } from 'vitest';
import { createDesign, createEllipse, createImage, createLine, createPage, createRect, createStar, createText } from '../src/core/model';
import { DesignParseError, FILE_FORMAT, parseDesign, serializeDesign } from '../src/core/serialize';
import { DesignStorage, MemoryStore } from '../src/core/storage';
import { duplicateElements, duplicatePage, deletePage, moveLayers, moveToIndex, nudge, removeElements } from '../src/core/ops';

function sample() {
  const d = createDesign(1080, 1080, 'Round trip');
  d.pages[0].background = '#FFD60A';
  d.pages[0].elements.push(
    createText({ text: 'Hello\nworld', fontFamily: 'Lora', fontWeight: 700, italic: true, align: 'center', rotation: 12 }),
    createRect({ cornerRadius: 24, strokeWidth: 3, opacity: 0.5 }),
    createEllipse(),
    createStar({ numPoints: 7 }),
    createLine({ points: [0, 0, 100, 50] }),
    createLine({}, 'arrow'),
    createImage({ src: 'data:image/png;base64,AAAA', width: 10, height: 20, locked: true, visible: false }),
  );
  d.pages.push(createPage('#000000', [createText({ text: 'Page two' })]));
  return d;
}

describe('serialization', () => {
  it('round-trips a design without loss', () => {
    const d = sample();
    const json = serializeDesign(d);
    expect(JSON.parse(json).format).toBe(FILE_FORMAT);
    const back = parseDesign(json);
    expect(back).toEqual(d);
    expect(serializeDesign(back)).toBe(json);
  });

  it('accepts a bare design object', () => {
    const d = sample();
    expect(parseDesign(JSON.stringify(d))).toEqual(d);
  });

  it('fills defaults and drops unknown props', () => {
    const raw = { width: 100, height: 50, pages: [{ elements: [{ type: 'rect', x: 5, evil: '<script>' }] }] };
    const d = parseDesign(JSON.stringify(raw));
    const el = d.pages[0].elements[0] as unknown as Record<string, unknown>;
    expect(el.x).toBe(5);
    expect(el.width).toBe(300);
    expect(el.evil).toBeUndefined();
    expect(d.pages[0].background).toBe('#FFFFFF');
    expect(typeof el.id).toBe('string');
  });

  it('rejects invalid files', () => {
    expect(() => parseDesign('nope')).toThrow(DesignParseError);
    expect(() => parseDesign('{"width":0,"height":5,"pages":[]}')).toThrow(DesignParseError);
    expect(() => parseDesign('{"width":5,"height":5,"pages":[{"elements":[{"type":"blob"}]}]}')).toThrow(/Unknown element/);
    expect(() => parseDesign(JSON.stringify({ format: FILE_FORMAT, version: 99, design: sample() }))).toThrow(/version/);
  });

  it('de-duplicates element ids', () => {
    const r = createRect();
    const raw = { width: 10, height: 10, pages: [{ elements: [r, r] }] };
    const d = parseDesign(JSON.stringify(raw));
    expect(d.pages[0].elements[0].id).not.toBe(d.pages[0].elements[1].id);
  });
});

describe('storage', () => {
  it('saves, lists, loads and removes designs', () => {
    const s = new DesignStorage(new MemoryStore());
    const a = sample();
    const b = createDesign(10, 10, 'B');
    b.updatedAt = a.updatedAt + 1000;
    s.save(a);
    s.save(b);
    expect(s.list().map((e) => e.name)).toEqual(['B', 'Round trip']);
    expect(s.load(a.id)).toEqual(a);
    s.setThumb(a.id, 'data:thumb');
    expect(s.list().find((e) => e.id === a.id)?.thumb).toBe('data:thumb');
    s.remove(a.id);
    expect(s.load(a.id)).toBeNull();
    expect(s.list()).toHaveLength(1);
  });
});

describe('ops', () => {
  const page = () => createPage('#fff', [createRect({ name: 'a' }), createRect({ name: 'b' }), createRect({ name: 'c' })]);
  const names = (p: ReturnType<typeof page>) => p.elements.map((e) => e.name).join('');

  it('reorders layers', () => {
    const p = page();
    const [a, , c] = p.elements;
    moveLayers(p, [a.id], 'forward');
    expect(names(p)).toBe('bac');
    moveLayers(p, [c.id], 'back');
    expect(names(p)).toBe('cba');
    moveLayers(p, [c.id], 'front');
    expect(names(p)).toBe('bac');
    moveToIndex(p, c.id, 0);
    expect(names(p)).toBe('cba');
  });

  it('duplicates, nudges and removes', () => {
    const p = page();
    const ids = duplicateElements(p, [p.elements[0].id], 20);
    expect(p.elements).toHaveLength(4);
    expect(p.elements[3].x).toBe(20);
    nudge(p, ids, 5, -5);
    expect(p.elements[3].x).toBe(25);
    removeElements(p, ids);
    expect(p.elements).toHaveLength(3);
  });

  it('duplicates and deletes pages, never the last one', () => {
    const d = createDesign(10, 10);
    d.pages[0].elements.push(createRect());
    expect(duplicatePage(d, 0)).toBe(1);
    expect(d.pages[1].elements[0].id).not.toBe(d.pages[0].elements[0].id);
    expect(deletePage(d, 1)).toBe(0);
    expect(deletePage(d, 0)).toBe(0);
    expect(d.pages).toHaveLength(1);
  });
});
