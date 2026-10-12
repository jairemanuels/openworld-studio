// Application state: the open design, active page, selection and the undo stack.
import { History } from './history';
import type { Design, DesignElement, Page } from './model';
import { restoreSnapshot, snapshotDesign } from './serialize';

type Listener = () => void;

export class Store {
  design: Design;
  pageIndex = 0;
  selection: string[] = [];
  readonly history: History<string>;
  private designListeners = new Set<Listener>();
  private selectionListeners = new Set<Listener>();
  private pageListeners = new Set<Listener>();
  private commitListeners = new Set<Listener>();

  constructor(design: Design) {
    this.design = design;
    this.history = new History<string>(snapshotDesign(design), 150);
  }

  get page(): Page {
    return this.design.pages[this.pageIndex];
  }

  get selectedElements(): DesignElement[] {
    const set = new Set(this.selection);
    return this.page.elements.filter((e) => set.has(e.id));
  }

  onDesign(fn: Listener) {
    this.designListeners.add(fn);
    return () => this.designListeners.delete(fn);
  }
  onSelection(fn: Listener) {
    this.selectionListeners.add(fn);
    return () => this.selectionListeners.delete(fn);
  }
  onPage(fn: Listener) {
    this.pageListeners.add(fn);
    return () => this.pageListeners.delete(fn);
  }
  /** Fires after each recorded history step (used for autosave). */
  onCommit(fn: Listener) {
    this.commitListeners.add(fn);
    return () => this.commitListeners.delete(fn);
  }

  private emit(set: Set<Listener>) {
    for (const fn of [...set]) fn();
  }

  /**
   * Mutates the design. With `commit: false` the change is shown live but not yet recorded
   * in history (used while dragging a slider); call `commit()` afterwards.
   */
  update(fn: (d: Design, page: Page) => void, opts: { commit?: boolean; silent?: boolean } = {}): void {
    fn(this.design, this.page);
    this.design.updatedAt = Date.now();
    this.pruneSelection();
    if (!opts.silent) this.emit(this.designListeners);
    if (opts.commit !== false) this.commit();
  }

  commit(): void {
    if (this.history.push(snapshotDesign(this.design))) this.emit(this.commitListeners);
  }

  undo(): boolean {
    const s = this.history.undo();
    if (s === undefined) return false;
    this.applySnapshot(s);
    return true;
  }

  redo(): boolean {
    const s = this.history.redo();
    if (s === undefined) return false;
    this.applySnapshot(s);
    return true;
  }

  private applySnapshot(s: string) {
    this.design = restoreSnapshot(this.design, s);
    this.design.updatedAt = Date.now();
    if (this.pageIndex >= this.design.pages.length) this.pageIndex = this.design.pages.length - 1;
    this.pruneSelection();
    this.emit(this.pageListeners);
    this.emit(this.designListeners);
    this.emit(this.selectionListeners);
    this.emit(this.commitListeners);
  }

  private pruneSelection() {
    const ids = new Set(this.page.elements.map((e) => e.id));
    const next = this.selection.filter((id) => ids.has(id));
    if (next.length !== this.selection.length) {
      this.selection = next;
      queueMicrotask(() => this.emit(this.selectionListeners));
    }
  }

  select(ids: string[]): void {
    const same = ids.length === this.selection.length && ids.every((id, i) => this.selection[i] === id);
    if (same) return;
    this.selection = [...ids];
    this.emit(this.selectionListeners);
  }

  setPage(index: number): void {
    const i = Math.max(0, Math.min(this.design.pages.length - 1, index));
    this.pageIndex = i;
    this.selection = [];
    this.emit(this.pageListeners);
    this.emit(this.designListeners);
    this.emit(this.selectionListeners);
  }
}
