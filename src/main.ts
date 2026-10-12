import './style.css';
import type { Design } from './core/model';
import { DesignStorage } from './core/storage';
import { type EditorHandle, mountEditor } from './ui/editor';
import { renderStart } from './ui/start';

const root = document.getElementById('app')!;
const storage = new DesignStorage(window.localStorage);
let editor: EditorHandle | null = null;
const pending = new Map<string, Design>();

function open(design: Design) {
  try {
    storage.save(design);
  } catch {
    pending.set(design.id, design);
  }
  location.hash = `#/edit/${design.id}`;
}

function route() {
  const m = location.hash.match(/^#\/edit\/([\w-]+)/);
  editor?.destroy();
  editor = null;
  if (m) {
    const design = pending.get(m[1]) ?? storage.load(m[1]);
    pending.delete(m[1]);
    if (design) {
      document.title = `${design.name} / openworld studio`;
      editor = mountEditor(root, design, storage, () => (location.hash = '#/'));
      (window as unknown as { __ows: unknown }).__ows = editor;
      return;
    }
  }
  document.title = 'openworld studio';
  renderStart(root, storage, open);
}

window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', () => editor?.destroy());
route();
