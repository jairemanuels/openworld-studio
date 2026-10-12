// Start screen: blank sizes, templates, recent designs, JSON import.
import type { Design } from '../core/model';
import { parseDesign } from '../core/serialize';
import type { DesignStorage } from '../core/storage';
import { SIZE_PRESETS, TEMPLATES, designFromSize, designFromTemplate } from '../core/templates';
import { formatDate, h, toast } from './dom';
import { pickFile } from './io';
import { renderPageToDataURL } from './render';

const thumbCache = new Map<string, string>();

function sizePreview(w: number, h0: number): HTMLElement {
  const max = 64;
  const s = max / Math.max(w, h0);
  return h('div', { class: 'size-preview' }, h('div', { class: 'size-box', style: `width:${Math.round(w * s)}px;height:${Math.round(h0 * s)}px` }));
}

export function renderStart(root: HTMLElement, storage: DesignStorage, open: (d: Design) => void) {
  root.innerHTML = '';

  const importBtn = h('button', {
    class: 'btn',
    type: 'button',
    onclick: async () => {
      const f = await pickFile('application/json,.json');
      if (!f) return;
      try {
        const d = parseDesign(await f.text());
        d.id = `design_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        open(d);
      } catch (e) {
        toast(`Import failed: ${(e as Error).message}`);
      }
    },
  }, 'Import JSON');

  const header = h('header', { class: 'start-top' },
    h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }), h('span', {}, 'openworld'), h('span', { class: 'brand-sub' }, '/studio')),
    h('div', { class: 'grow' }),
    importBtn,
    h('a', { class: 'btn ghost', href: 'https://github.com/jairemanuels/openworld-studio', target: '_blank', rel: 'noopener' }, 'Source'),
  );

  // Blank sizes
  const sizeGrid = h('div', { class: 'grid sizes' });
  const presetLabels: Record<string, string> = { square: 'Instagram post' };
  for (const p of SIZE_PRESETS) {
    sizeGrid.append(
      h('button', { class: 'card size-card', type: 'button', onclick: () => open(designFromSize(p.width, p.height, presetLabels[p.id] ?? p.label)) },
        sizePreview(p.width, p.height),
        h('div', { class: 'card-title' }, presetLabels[p.id] ?? p.label),
        h('div', { class: 'card-meta' }, `${p.width} x ${p.height} px`),
      ),
    );
  }
  const cw = h('input', { type: 'number', min: '16', max: '8000', value: '1200', 'aria-label': 'Custom width' });
  const ch = h('input', { type: 'number', min: '16', max: '8000', value: '800', 'aria-label': 'Custom height' });
  sizeGrid.append(
    h('form', {
      class: 'card size-card custom',
      onsubmit: (e: Event) => {
        e.preventDefault();
        const w = Number(cw.value);
        const hh = Number(ch.value);
        if (!(w >= 16 && hh >= 16 && w <= 8000 && hh <= 8000)) return toast('Use a size between 16 and 8000 px');
        open(designFromSize(w, hh, 'Custom design'));
      },
    },
      h('div', { class: 'card-title' }, 'Custom size'),
      h('div', { class: 'custom-row' }, cw, h('span', { class: 'mono' }, 'x'), ch),
      h('button', { class: 'btn primary small', type: 'submit' }, 'Create'),
    ),
  );

  // Templates
  const tplGrid = h('div', { class: 'grid templates' });
  for (const t of TEMPLATES) {
    const img = h('img', { alt: `${t.name} preview`, loading: 'lazy' });
    const cached = thumbCache.get(t.id);
    if (cached) img.src = cached;
    else
      renderPageToDataURL(designFromTemplate(t), 0, { pixelRatio: 360 / Math.max(t.width, t.height), mimeType: 'image/jpeg', quality: 0.85 })
        .then((u) => {
          thumbCache.set(t.id, u);
          img.src = u;
        })
        .catch(() => undefined);
    tplGrid.append(
      h('button', { class: 'card tpl-card', type: 'button', 'data-template': t.id, onclick: () => open(designFromTemplate(t)) },
        h('div', { class: 'thumb' }, img),
        h('div', { class: 'card-title' }, t.name),
        h('div', { class: 'card-meta' }, `${t.category} / ${t.width} x ${t.height}${t.pages.length > 1 ? ` / ${t.pages.length} pages` : ''}`),
      ),
    );
  }

  // Recent
  const recent = storage.list();
  const recentGrid = h('div', { class: 'grid recent' });
  for (const r of recent) {
    const card = h('div', { class: 'card recent-card' },
      h('button', { class: 'thumb', type: 'button', onclick: () => { const d = storage.load(r.id); if (d) open(d); else toast('Could not load this design'); } },
        r.thumb ? h('img', { src: r.thumb, alt: '' }) : h('span', { class: 'mono muted' }, 'no preview')),
      h('div', { class: 'card-title' }, r.name),
      h('div', { class: 'card-meta' }, `${r.width} x ${r.height} / ${r.pages} page${r.pages === 1 ? '' : 's'} / ${formatDate(r.updatedAt)}`),
      h('button', { class: 'link danger', type: 'button', onclick: () => { if (confirm(`Delete "${r.name}" from this browser?`)) { storage.remove(r.id); renderStart(root, storage, open); } } }, 'Delete'),
    );
    recentGrid.append(card);
  }

  root.append(
    h('div', { class: 'start' },
      header,
      h('main', { class: 'start-main' },
        h('section', { class: 'hero' },
          h('h1', {}, 'Make something worth sharing.'),
          h('p', { class: 'lead' }, 'A free, open-source design editor that runs entirely in your browser. Pick a size or start from a template. Your work is saved locally.'),
        ),
        recent.length ? h('section', {}, h('h2', {}, 'Recent designs'), recentGrid) : null,
        h('section', {}, h('h2', {}, 'Start blank'), sizeGrid),
        h('section', {}, h('h2', {}, 'Templates'), tplGrid),
      ),
      h('footer', { class: 'start-foot mono' }, 'openworld studio / MIT licensed / ', h('a', { href: 'https://github.com/jairemanuels/openworld-studio', target: '_blank', rel: 'noopener' }, 'github.com/jairemanuels/openworld-studio')),
    ),
  );
}
