/**
 * Generic snapshot-based undo/redo stack.
 * Snapshots are compared with `equals` so pushing an unchanged state is a no-op.
 */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private _present: T;

  constructor(
    initial: T,
    private readonly limit = 100,
    private readonly equals: (a: T, b: T) => boolean = (a, b) => a === b,
  ) {
    this._present = initial;
  }

  get present(): T {
    return this._present;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Record a new state. Returns false when the state equals the present one. */
  push(state: T): boolean {
    if (this.equals(state, this._present)) return false;
    this.past.push(this._present);
    if (this.past.length > this.limit) this.past.splice(0, this.past.length - this.limit);
    this._present = state;
    this.future = [];
    return true;
  }

  undo(): T | undefined {
    const prev = this.past.pop();
    if (prev === undefined) return undefined;
    this.future.push(this._present);
    this._present = prev;
    return prev;
  }

  redo(): T | undefined {
    const next = this.future.pop();
    if (next === undefined) return undefined;
    this.past.push(this._present);
    this._present = next;
    return next;
  }

  /** Replace the whole history with a single state (e.g. after loading a design). */
  reset(state: T): void {
    this.past = [];
    this.future = [];
    this._present = state;
  }

  get size(): { past: number; future: number } {
    return { past: this.past.length, future: this.future.length };
  }
}
