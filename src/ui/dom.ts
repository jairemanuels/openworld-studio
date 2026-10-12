// Tiny DOM helpers and hand-drawn icon set (original artwork, 20x20 grid, stroke based).

type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const P: Record<string, string> = {
  rect: '<rect x="3.5" y="5.5" width="13" height="9"/>',
  rounded: '<rect x="3.5" y="5.5" width="13" height="9" rx="3"/>',
  circle: '<circle cx="10" cy="10" r="6.5"/>',
  line: '<path d="M3.5 16.5 16.5 3.5"/>',
  arrow: '<path d="M3.5 16.5 16.5 3.5M9 3.5h7.5V11"/>',
  star: '<path d="M10 3l2.1 4.4 4.8.6-3.5 3.3.9 4.8L10 13.8 5.7 16.1l.9-4.8L3.1 8l4.8-.6z"/>',
  text: '<path d="M4.5 5V3.5h11V5M10 3.5v13M7.5 16.5h5"/>',
  image: '<rect x="3.5" y="4.5" width="13" height="11"/><path d="M3.5 13l4-4 3 3 2-2 4 4"/><circle cx="13" cy="7.5" r="1"/>',
  eye: '<path d="M2.5 10s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2"/>',
  eyeOff: '<path d="M2.5 10s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5zM3.5 3.5l13 13"/>',
  lock: '<rect x="5" y="9" width="10" height="7.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
  unlock: '<rect x="5" y="9" width="10" height="7.5"/><path d="M7 9V6.5a3 3 0 0 1 5.8-1"/>',
  undo: '<path d="M7 5.5 3.5 9 7 12.5M3.5 9H12a4.5 4.5 0 0 1 0 9h-2"/>',
  redo: '<path d="M13 5.5 16.5 9 13 12.5M16.5 9H8a4.5 4.5 0 0 0 0 9h2"/>',
  plus: '<path d="M10 4v12M4 10h12"/>',
  minus: '<path d="M4 10h12"/>',
  trash: '<path d="M4 6h12M8 6V4h4v2M5.5 6l1 10.5h7l1-10.5"/>',
  copy: '<rect x="7" y="7" width="9.5" height="9.5"/><path d="M13 7V3.5H3.5V13H7"/>',
  up: '<path d="M10 16V4M5.5 8.5 10 4l4.5 4.5"/>',
  down: '<path d="M10 4v12M5.5 11.5 10 16l4.5-4.5"/>',
  top: '<path d="M4 3.5h12M10 17V7M5.5 11.5 10 7l4.5 4.5"/>',
  bottom: '<path d="M4 16.5h12M10 3v10M5.5 8.5 10 13l4.5-4.5"/>',
  fit: '<path d="M3.5 7.5v-4h4M12.5 3.5h4v4M16.5 12.5v4h-4M7.5 16.5h-4v-4"/>',
  alignLeft: '<path d="M3.5 5h13M3.5 9h8M3.5 13h13M3.5 17h8"/>',
  alignCenter: '<path d="M3.5 5h13M6 9h8M3.5 13h13M6 17h8"/>',
  alignRight: '<path d="M3.5 5h13M8.5 9h8M3.5 13h13M8.5 17h8"/>',
  home: '<path d="M3.5 9.5 10 4l6.5 5.5V16.5h-13z"/>',
};

export function icon(name: keyof typeof P | string, size = 18): SVGSVGElement {
  const wrap = document.createElement('span');
  wrap.innerHTML = `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${P[name] ?? ''}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}

export function iconButton(name: string, title: string, onClick: (e: MouseEvent) => void, extra = ''): HTMLButtonElement {
  const b = h('button', { class: `icon-btn ${extra}`.trim(), title, 'aria-label': title, type: 'button' });
  b.append(icon(name));
  b.addEventListener('click', onClick);
  return b;
}

let toastTimer: number | undefined;
export function toast(message: string) {
  let el = document.querySelector<HTMLDivElement>('.toast');
  if (!el) {
    el = h('div', { class: 'toast', role: 'status' });
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 2600);
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
