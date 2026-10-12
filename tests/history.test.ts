import { describe, expect, it } from 'vitest';
import { History } from '../src/core/history';
import { createDesign, createRect, createText } from '../src/core/model';
import { Store } from '../src/core/store';

describe('History', () => {
  it('undoes and redoes in order', () => {
    const h = new History('a');
    h.push('b');
    h.push('c');
    expect(h.present).toBe('c');
    expect(h.undo()).toBe('b');
    expect(h.undo()).toBe('a');
    expect(h.undo()).toBeUndefined();
    expect(h.redo()).toBe('b');
    expect(h.redo()).toBe('c');
    expect(h.redo()).toBeUndefined();
  });

  it('ignores pushes equal to the present state', () => {
    const h = new History('a');
    expect(h.push('a')).toBe(false);
    expect(h.canUndo).toBe(false);
  });

  it('clears the redo stack on a new push', () => {
    const h = new History(1);
    h.push(2);
    h.push(3);
    h.undo();
    expect(h.canRedo).toBe(true);
    h.push(4);
    expect(h.canRedo).toBe(false);
    expect(h.undo()).toBe(2);
  });

  it('respects the size limit', () => {
    const h = new History(0, 3);
    for (let i = 1; i <= 10; i++) h.push(i);
    expect(h.size.past).toBe(3);
    h.undo();
    h.undo();
    expect(h.undo()).toBe(7);
    expect(h.undo()).toBeUndefined();
  });

  it('reset drops past and future', () => {
    const h = new History('x');
    h.push('y');
    h.reset('z');
    expect(h.present).toBe('z');
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });
});

describe('Store undo integration', () => {
  it('records committed edits and restores them', () => {
    const store = new Store(createDesign(500, 500));
    const r = createRect({ x: 10 });
    store.update((_d, p) => p.elements.push(r));
    store.update((_d, p) => (p.elements[0].x = 99));
    expect(store.page.elements[0].x).toBe(99);
    store.undo();
    expect(store.page.elements[0].x).toBe(10);
    store.undo();
    expect(store.page.elements).toHaveLength(0);
    store.redo();
    store.redo();
    expect(store.page.elements[0].x).toBe(99);
  });

  it('live (uncommitted) edits collapse into one undo step', () => {
    const store = new Store(createDesign(500, 500));
    store.update((_d, p) => p.elements.push(createText({ fontSize: 10 })));
    for (let s = 11; s <= 20; s++) store.update((_d, p) => ((p.elements[0] as { fontSize: number }).fontSize = s), { commit: false });
    store.commit();
    store.undo();
    expect((store.page.elements[0] as { fontSize: number }).fontSize).toBe(10);
  });

  it('clamps the active page after undoing a page add', () => {
    const store = new Store(createDesign(500, 500));
    store.update((d) => d.pages.push({ id: 'p2', background: '#fff', elements: [] }));
    store.setPage(1);
    store.undo();
    expect(store.design.pages).toHaveLength(1);
    expect(store.pageIndex).toBe(0);
  });
});
