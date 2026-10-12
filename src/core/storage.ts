// localStorage persistence: one key per design plus an index of recent designs.
import type { Design } from './model';
import { parseDesign, serializeDesign } from './serialize';

export interface RecentEntry {
  id: string;
  name: string;
  width: number;
  height: number;
  pages: number;
  updatedAt: number;
  thumb?: string;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const INDEX_KEY = 'ows:index';
const designKey = (id: string) => `ows:design:${id}`;

export class DesignStorage {
  constructor(private readonly kv: KeyValueStore) {}

  list(): RecentEntry[] {
    try {
      const raw = this.kv.getItem(INDEX_KEY);
      const list = raw ? (JSON.parse(raw) as RecentEntry[]) : [];
      return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    } catch {
      return [];
    }
  }

  /** Saves a design. Throws if the underlying storage is full. */
  save(design: Design, thumb?: string): void {
    this.kv.setItem(designKey(design.id), serializeDesign(design));
    const list = this.list().filter((e) => e.id !== design.id);
    const prev = this.list().find((e) => e.id === design.id);
    list.unshift({
      id: design.id,
      name: design.name,
      width: design.width,
      height: design.height,
      pages: design.pages.length,
      updatedAt: design.updatedAt,
      thumb: thumb ?? prev?.thumb,
    });
    this.kv.setItem(INDEX_KEY, JSON.stringify(list.slice(0, 50)));
  }

  setThumb(id: string, thumb: string): void {
    const list = this.list();
    const entry = list.find((e) => e.id === id);
    if (!entry) return;
    entry.thumb = thumb;
    try {
      this.kv.setItem(INDEX_KEY, JSON.stringify(list));
    } catch {
      /* thumbnails are optional */
    }
  }

  load(id: string): Design | null {
    const raw = this.kv.getItem(designKey(id));
    if (!raw) return null;
    try {
      return parseDesign(raw);
    } catch {
      return null;
    }
  }

  remove(id: string): void {
    this.kv.removeItem(designKey(id));
    this.kv.setItem(INDEX_KEY, JSON.stringify(this.list().filter((e) => e.id !== id)));
  }
}

export class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
