import { describe, expect, it } from 'vitest';
import { FONT_FAMILIES, elementSize } from '../src/core/model';
import { parseDesign, serializeDesign } from '../src/core/serialize';
import { SIZE_PRESETS, TEMPLATES, designFromSize, designFromTemplate, getTemplate } from '../src/core/templates';

describe('templates', () => {
  it('ships at least six templates with unique ids', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  for (const t of TEMPLATES) {
    describe(t.name, () => {
      const d = designFromTemplate(t);

      it('builds a design with the template size and pages', () => {
        expect(d.width).toBe(t.width);
        expect(d.height).toBe(t.height);
        expect(d.pages).toHaveLength(t.pages.length);
        expect(d.pages.every((p) => p.elements.length > 0)).toBe(true);
      });

      it('uses only text and shapes with bundled fonts', () => {
        for (const p of d.pages)
          for (const el of p.elements) {
            expect(el.type).not.toBe('image');
            if (el.type === 'text') expect(FONT_FAMILIES).toContain(el.fontFamily);
          }
      });

      it('keeps element anchors near the canvas', () => {
        for (const p of d.pages)
          for (const el of p.elements) {
            const s = elementSize(el);
            expect(el.x + s.width).toBeGreaterThan(0);
            expect(el.y + s.height).toBeGreaterThan(0);
            expect(el.x).toBeLessThan(d.width);
            expect(el.y).toBeLessThan(d.height);
          }
      });

      it('survives a serialization round trip', () => {
        expect(parseDesign(serializeDesign(d))).toEqual(d);
      });

      it('creates fresh ids on every load', () => {
        const again = designFromTemplate(t);
        expect(again.id).not.toBe(d.id);
        expect(again.pages[0].elements[0].id).not.toBe(d.pages[0].elements[0].id);
      });
    });
  }

  it('looks templates up by id', () => {
    expect(getTemplate('quote-card')?.name).toBe('Quote card');
    expect(getTemplate('missing')).toBeUndefined();
  });

  it('includes the core size presets', () => {
    const sizes = SIZE_PRESETS.map((p) => `${p.width}x${p.height}`);
    expect(sizes).toEqual(expect.arrayContaining(['1080x1080', '1080x1920', '794x1123', '1920x1080']));
  });

  it('clamps custom sizes', () => {
    const d = designFromSize(0, 99999);
    expect(d.width).toBe(16);
    expect(d.height).toBe(8000);
    expect(d.pages).toHaveLength(1);
  });
});
