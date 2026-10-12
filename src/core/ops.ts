// Pure operations on pages and designs. All functions mutate the passed object in place.
import { type Design, type DesignElement, type Page, uid } from './model';

export function cloneElement(el: DesignElement, offset = 0): DesignElement {
  const copy = JSON.parse(JSON.stringify(el)) as DesignElement;
  copy.id = uid();
  copy.x += offset;
  copy.y += offset;
  return copy;
}

export function findElement(page: Page, id: string): DesignElement | undefined {
  return page.elements.find((e) => e.id === id);
}

export function updateElement(page: Page, id: string, patch: Partial<DesignElement>): void {
  const el = findElement(page, id);
  if (el) Object.assign(el, patch);
}

export function addElements(page: Page, els: DesignElement[]): string[] {
  page.elements.push(...els);
  return els.map((e) => e.id);
}

export function removeElements(page: Page, ids: string[]): void {
  const set = new Set(ids);
  page.elements = page.elements.filter((e) => !set.has(e.id));
}

/** Duplicates the given elements (keeping relative order) and returns the new ids. */
export function duplicateElements(page: Page, ids: string[], offset = 20): string[] {
  const set = new Set(ids);
  const copies = page.elements.filter((e) => set.has(e.id)).map((e) => cloneElement(e, offset));
  page.elements.push(...copies);
  return copies.map((c) => c.id);
}

export type LayerMove = 'forward' | 'backward' | 'front' | 'back';

/** Moves elements in z-order. Index 0 is the bottom-most element. */
export function moveLayers(page: Page, ids: string[], dir: LayerMove): void {
  const set = new Set(ids);
  const els = page.elements;
  if (dir === 'front' || dir === 'back') {
    const picked = els.filter((e) => set.has(e.id));
    const rest = els.filter((e) => !set.has(e.id));
    page.elements = dir === 'front' ? [...rest, ...picked] : [...picked, ...rest];
    return;
  }
  if (dir === 'forward') {
    for (let i = els.length - 2; i >= 0; i--) {
      if (set.has(els[i].id) && !set.has(els[i + 1].id)) [els[i], els[i + 1]] = [els[i + 1], els[i]];
    }
  } else {
    for (let i = 1; i < els.length; i++) {
      if (set.has(els[i].id) && !set.has(els[i - 1].id)) [els[i], els[i - 1]] = [els[i - 1], els[i]];
    }
  }
}

/** Moves one element to an absolute z-index. */
export function moveToIndex(page: Page, id: string, index: number): void {
  const from = page.elements.findIndex((e) => e.id === id);
  if (from < 0) return;
  const [el] = page.elements.splice(from, 1);
  const to = Math.max(0, Math.min(page.elements.length, index));
  page.elements.splice(to, 0, el);
}

export function nudge(page: Page, ids: string[], dx: number, dy: number): void {
  const set = new Set(ids);
  for (const el of page.elements) {
    if (set.has(el.id) && !el.locked) {
      el.x += dx;
      el.y += dy;
    }
  }
}

export function addPage(design: Design, page: Page, at = design.pages.length): number {
  design.pages.splice(at, 0, page);
  return at;
}

export function duplicatePage(design: Design, index: number): number {
  const src = design.pages[index];
  if (!src) return index;
  const copy: Page = {
    id: uid('page'),
    background: src.background,
    elements: src.elements.map((e) => cloneElement(e)),
  };
  design.pages.splice(index + 1, 0, copy);
  return index + 1;
}

/** Deletes a page; refuses to delete the last remaining page. Returns the new active index. */
export function deletePage(design: Design, index: number): number {
  if (design.pages.length <= 1) return 0;
  design.pages.splice(index, 1);
  return Math.min(index, design.pages.length - 1);
}

export function movePage(design: Design, from: number, to: number): number {
  if (from < 0 || from >= design.pages.length) return from;
  const [p] = design.pages.splice(from, 1);
  const t = Math.max(0, Math.min(design.pages.length, to));
  design.pages.splice(t, 0, p);
  return t;
}
