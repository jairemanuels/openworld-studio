// Editor screen: toolbar, insert panel, canvas, properties, layers, pages, shortcuts, autosave.
import {
  type Design,
  type DesignElement,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  createEllipse,
  createImage,
  createLine,
  createPage,
  createRect,
  createStar,
  createText,
  elementSize,
} from '../core/model';
import {
  addElements,
  addPage,
  cloneElement,
  deletePage,
  duplicateElements,
  duplicatePage,
  moveLayers,
  moveToIndex,
  nudge,
  removeElements,
  type LayerMove,
} from '../core/ops';
import type { DesignStorage } from '../core/storage';
import { Store } from '../core/store';
import { CanvasEditor } from './canvas';
import { h, icon, iconButton, toast } from './dom';
import { exportJson, exportPdf, exportPng, pickFile, readImageFile } from './io';
import { renderPageToDataURL } from './render';

const SWATCHES = ['#FFFFFF', '#0A0A0A', '#FFD60A', '#F3F0E8', '#13213C', '#2F6B4F', '#D9480F', '#7A7A7A'];

let clipboard: DesignElement[] = [];

export interface EditorHandle {
  destroy(): void;
  store: Store;
  canvas: CanvasEditor;
}

export function mountEditor(root: HTMLElement, design: Design, storage: DesignStorage, goHome: () => void): EditorHandle {
  root.innerHTML = '';
  const store = new Store(design);
  const cleanups: Array<() => void> = [];

  // ---------- autosave ----------
  let saveTimer: number | undefined;
  let thumbTimer: number | undefined;
  const status = h('span', { class: 'save-status mono' }, 'Saved');
  const save = () => {
    try {
      storage.save(store.design);
      status.textContent = 'Saved';
      status.classList.remove('warn');
    } catch {
      status.textContent = 'Not saved: storage full';
      status.classList.add('warn');
      toast('Browser storage is full. Export your design as JSON to keep it.');
    }
    window.clearTimeout(thumbTimer);
    thumbTimer = window.setTimeout(async () => {
      try {
        const d = store.design;
        const thumb = await renderPageToDataURL(d, 0, { pixelRatio: 320 / Math.max(d.width, d.height), mimeType: 'image/jpeg', quality: 0.7 });
        storage.setThumb(d.id, thumb);
      } catch {
        /* optional */
      }
    }, 1200);
  };
  const scheduleSave = () => {
    status.textContent = 'Saving';
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(save, 400);
  };
  cleanups.push(store.onCommit(scheduleSave), () => window.clearTimeout(saveTimer));
  save();

  // ---------- layout ----------
  const nameInput = h('input', { class: 'name-input', value: design.name, 'aria-label': 'Design name', spellcheck: false });
  nameInput.addEventListener('change', () => store.update((d) => (d.name = nameInput.value.trim() || 'Untitled design')));
  nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && nameInput.blur());

  const zoomLabel = h('button', { class: 'zoom-label mono', type: 'button', title: 'Zoom to fit' }, '100%');
  const undoBtn = iconButton('undo', 'Undo (Ctrl+Z)', () => store.undo());
  const redoBtn = iconButton('redo', 'Redo (Ctrl+Shift+Z)', () => store.redo());

  const busy = async (btn: HTMLButtonElement, fn: () => Promise<void>) => {
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Exporting';
    try {
      await fn();
    } catch (e) {
      toast(`Export failed: ${(e as Error).message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  };
  const pngBtn = h('button', { class: 'btn', type: 'button', title: 'Export current page as PNG at 2x' }, 'PNG');
  pngBtn.addEventListener('click', () => busy(pngBtn, () => exportPng(store.design, store.pageIndex)));
  const pdfBtn = h('button', { class: 'btn primary', type: 'button', title: 'Export all pages as PDF' }, 'PDF');
  pdfBtn.addEventListener('click', () => busy(pdfBtn, () => exportPdf(store.design)));
  const jsonBtn = h('button', { class: 'btn', type: 'button', title: 'Download design file (.json)', onclick: () => exportJson(store.design) }, 'JSON');

  const scroller = h('div', { class: 'scroller' });
  const mount = h('div', { class: 'stage-mount' });
  scroller.append(h('div', { class: 'stage-wrap' }, mount));

  const topbar = h('header', { class: 'topbar' },
    h('button', { class: 'brand as-btn', type: 'button', title: 'All designs', onclick: () => goHome() }, h('span', { class: 'brand-mark' }), h('span', {}, 'openworld'), h('span', { class: 'brand-sub' }, '/studio')),
    h('div', { class: 'sep' }),
    nameInput,
    status,
    h('div', { class: 'grow' }),
    undoBtn,
    redoBtn,
    h('div', { class: 'sep' }),
    iconButton('minus', 'Zoom out (Ctrl+-)', () => canvas.zoomBy(1 / 1.2)),
    zoomLabel,
    iconButton('plus', 'Zoom in (Ctrl+=)', () => canvas.zoomBy(1.2)),
    iconButton('fit', 'Zoom to fit (Ctrl+0)', () => canvas.fit()),
    h('div', { class: 'sep' }),
    h('span', { class: 'mono muted export-label' }, 'Export'),
    jsonBtn,
    pngBtn,
    pdfBtn,
  );

  const left = h('aside', { class: 'panel left' });
  const props = h('section', { class: 'props' });
  const layers = h('section', { class: 'layers' });
  const right = h('aside', { class: 'panel right' }, props, layers);
  const pagesBar = h('footer', { class: 'pages-bar' });
  const workspace = h('main', { class: 'workspace' }, scroller, pagesBar);
  const shell = h('div', { class: 'editor' }, topbar, h('div', { class: 'body' }, left, workspace, right));
  root.append(shell);

  const canvas = new CanvasEditor(scroller, mount, store, (z) => (zoomLabel.textContent = `${Math.round(z * 100)}%`));
  zoomLabel.addEventListener('click', () => canvas.fit());
  requestAnimationFrame(() => canvas.fit());
  const onResize = () => canvas.fit();
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize), () => canvas.destroy());

  // ---------- helpers ----------
  const W = () => store.design.width;
  const H = () => store.design.height;
  const insert = (el: DesignElement) => {
    const { width, height } = elementSize(el);
    if (el.type !== 'line' && el.type !== 'arrow') {
      el.x = Math.round((W() - width) / 2);
      el.y = Math.round((H() - height) / 2);
    } else {
      el.x = Math.round((W() - width) / 2);
      el.y = Math.round(H() / 2);
    }
    store.update((_d, page) => addElements(page, [el]));
    store.select([el.id]);
  };
  const unit = () => Math.min(W(), H());

  const addImageFile = async (file: File, at?: { x: number; y: number }) => {
    if (!file.type.startsWith('image/')) return toast('Only image files can be added');
    try {
      const { src, width, height } = await readImageFile(file);
      const s = Math.min(1, (W() * 0.6) / width, (H() * 0.6) / height);
      const el = createImage({ src, width: Math.round(width * s), height: Math.round(height * s), name: file.name.slice(0, 40) || 'Image' });
      if (at) {
        el.x = Math.round(at.x - el.width / 2);
        el.y = Math.round(at.y - el.height / 2);
        store.update((_d, page) => addElements(page, [el]));
        store.select([el.id]);
      } else insert(el);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  // ---------- left: insert panel ----------
  const textPreset = (label: string, cls: string, make: () => DesignElement) =>
    h('button', { class: `insert-text ${cls}`, type: 'button', onclick: () => insert(make()) }, label);
  const shapeBtn = (ico: string, label: string, make: () => DesignElement) => {
    const b = h('button', { class: 'shape-btn', type: 'button', title: `Add ${label.toLowerCase()}`, onclick: () => insert(make()) }, icon(ico, 22), h('span', {}, label));
    return b;
  };
  const bgInput = h('input', { type: 'color', 'aria-label': 'Page background color' });
  const bgHex = h('input', { class: 'hex mono', 'aria-label': 'Page background hex', maxlength: 9 });
  const syncBg = () => {
    const bg = store.page.background;
    bgHex.value = bg;
    if (/^#[0-9a-f]{6}$/i.test(bg)) bgInput.value = bg;
  };
  const setBg = (c: string, commit = true) => store.update((_d, page) => (page.background = c), { commit });
  bgInput.addEventListener('input', () => setBg(bgInput.value, false));
  bgInput.addEventListener('change', () => store.commit());
  bgHex.addEventListener('change', () => setBg(bgHex.value.trim()));
  const swatches = h('div', { class: 'swatches' }, ...SWATCHES.map((c) => h('button', { class: 'swatch', type: 'button', title: c, style: `background:${c}`, onclick: () => setBg(c) })));

  const uploadBtn = h('button', { class: 'btn block', type: 'button' }, icon('image'), 'Upload image');
  uploadBtn.addEventListener('click', async () => {
    const f = await pickFile('image/*');
    if (f) addImageFile(f);
  });

  left.append(
    h('div', { class: 'panel-section' },
      h('h3', {}, 'Text'),
      textPreset('Add a heading', 'heading', () => createText({ text: 'Add a heading', fontSize: Math.round(unit() * 0.09), fontWeight: 700, width: Math.round(W() * 0.7), name: 'Heading', letterSpacing: -1 })),
      textPreset('Add a subheading', 'subheading', () => createText({ text: 'Add a subheading', fontSize: Math.round(unit() * 0.05), fontWeight: 500, width: Math.round(W() * 0.6), name: 'Subheading' })),
      textPreset('Add body text', 'body', () => createText({ text: 'Add a little bit of body text. Double-click to edit.', fontSize: Math.round(unit() * 0.03), width: Math.round(W() * 0.5), lineHeight: 1.4, name: 'Body' })),
    ),
    h('div', { class: 'panel-section' },
      h('h3', {}, 'Shapes'),
      h('div', { class: 'shape-grid' },
        shapeBtn('rect', 'Rectangle', () => createRect({ width: Math.round(unit() * 0.4), height: Math.round(unit() * 0.28) })),
        shapeBtn('rounded', 'Rounded', () => createRect({ name: 'Rounded rectangle', width: Math.round(unit() * 0.4), height: Math.round(unit() * 0.28), cornerRadius: Math.round(unit() * 0.03), fill: '#FFD60A' })),
        shapeBtn('circle', 'Circle', () => createEllipse({ width: Math.round(unit() * 0.3), height: Math.round(unit() * 0.3) })),
        shapeBtn('line', 'Line', () => createLine({ points: [0, 0, Math.round(unit() * 0.4), 0], strokeWidth: Math.max(2, Math.round(unit() * 0.006)) })),
        shapeBtn('arrow', 'Arrow', () => createLine({ points: [0, 0, Math.round(unit() * 0.4), 0], strokeWidth: Math.max(2, Math.round(unit() * 0.008)) }, 'arrow')),
        shapeBtn('star', 'Star', () => createStar({ width: Math.round(unit() * 0.3), height: Math.round(unit() * 0.3) })),
      ),
    ),
    h('div', { class: 'panel-section' },
      h('h3', {}, 'Image'),
      uploadBtn,
      h('p', { class: 'hint' }, 'Or drop an image file onto the canvas, or paste one from the clipboard.'),
    ),
    h('div', { class: 'panel-section' },
      h('h3', {}, 'Page background'),
      h('div', { class: 'color-row' }, bgInput, bgHex),
      swatches,
    ),
    h('div', { class: 'panel-section shortcuts' },
      h('h3', {}, 'Shortcuts'),
      ...[
        ['Double-click', 'edit text'],
        ['Shift+click', 'multi-select'],
        ['Ctrl+D', 'duplicate'],
        ['Ctrl+C / V', 'copy, paste'],
        ['Arrows', 'nudge (Shift x10)'],
        ['Ctrl+] / [', 'forward, backward'],
        ['Del', 'delete'],
      ].map(([k, v]) => h('div', { class: 'kbd-row' }, h('kbd', {}, k), h('span', {}, v))),
    ),
  );

  // drag & drop images
  scroller.addEventListener('dragover', (e) => {
    e.preventDefault();
    scroller.classList.add('drop');
  });
  scroller.addEventListener('dragleave', () => scroller.classList.remove('drop'));
  scroller.addEventListener('drop', (e) => {
    e.preventDefault();
    scroller.classList.remove('drop');
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    canvas.stage.setPointersPositions(e);
    const p = canvas.stage.getRelativePointerPosition();
    const inside = p && p.x >= 0 && p.y >= 0 && p.x <= W() && p.y <= H();
    files.forEach((f, i) => addImageFile(f, inside ? { x: p!.x + i * 20, y: p!.y + i * 20 } : undefined));
  });

  // ---------- actions ----------
  const sel = () => store.selection;
  const actions = {
    delete: () => sel().length && store.update((_d, page) => removeElements(page, sel())),
    duplicate: () => {
      if (!sel().length) return;
      let ids: string[] = [];
      store.update((_d, page) => (ids = duplicateElements(page, sel(), Math.round(unit() * 0.02))));
      store.select(ids);
    },
    copy: () => {
      clipboard = store.selectedElements.map((e) => JSON.parse(JSON.stringify(e)));
      if (clipboard.length) toast(`Copied ${clipboard.length} element${clipboard.length > 1 ? 's' : ''}`);
    },
    cut: () => {
      actions.copy();
      actions.delete();
    },
    paste: () => {
      if (!clipboard.length) return;
      const copies = clipboard.map((e) => cloneElement(e, Math.round(unit() * 0.02)));
      clipboard = copies.map((e) => JSON.parse(JSON.stringify(e)));
      store.update((_d, page) => addElements(page, copies));
      store.select(copies.map((c) => c.id));
    },
    layer: (dir: LayerMove) => sel().length && store.update((_d, page) => moveLayers(page, sel(), dir)),
    nudge: (dx: number, dy: number) => sel().length && store.update((_d, page) => nudge(page, sel(), dx, dy)),
  };

  // ---------- keyboard ----------
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (canvas.isEditingText) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') {
      e.preventDefault();
      e.shiftKey ? store.redo() : store.undo();
    } else if (mod && k === 'y') {
      e.preventDefault();
      store.redo();
    } else if (mod && k === 'd') {
      e.preventDefault();
      actions.duplicate();
    } else if (mod && k === 'c') {
      actions.copy();
    } else if (mod && k === 'x') {
      actions.cut();
    } else if (mod && k === 'a') {
      e.preventDefault();
      store.select(store.page.elements.filter((x) => !x.locked && x.visible).map((x) => x.id));
    } else if (mod && (k === '=' || k === '+')) {
      e.preventDefault();
      canvas.zoomBy(1.2);
    } else if (mod && k === '-') {
      e.preventDefault();
      canvas.zoomBy(1 / 1.2);
    } else if (mod && k === '0') {
      e.preventDefault();
      canvas.fit();
    } else if (mod && k === ']') {
      e.preventDefault();
      actions.layer(e.shiftKey ? 'front' : 'forward');
    } else if (mod && k === '[') {
      e.preventDefault();
      actions.layer(e.shiftKey ? 'back' : 'backward');
    } else if (k === 'delete' || k === 'backspace') {
      if (sel().length) {
        e.preventDefault();
        actions.delete();
      }
    } else if (k === 'escape') {
      store.select([]);
    } else if (k === 'enter' && store.selectedElements.length === 1 && store.selectedElements[0].type === 'text') {
      e.preventDefault();
      canvas.startTextEdit(sel()[0]);
    } else if (k.startsWith('arrow') && sel().length) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[k];
      if (d) actions.nudge(d[0], d[1]);
    }
  };
  const onPaste = (e: ClipboardEvent) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    e.preventDefault();
    if (files.length) files.forEach((f) => addImageFile(f));
    else actions.paste();
  };
  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    canvas.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  };
  window.addEventListener('keydown', onKey);
  document.addEventListener('paste', onPaste);
  scroller.addEventListener('wheel', onWheel, { passive: false });
  cleanups.push(() => window.removeEventListener('keydown', onKey), () => document.removeEventListener('paste', onPaste));

  // ---------- right: properties ----------
  let propsBusy = false;
  const live = (fn: (el: DesignElement) => void, commit: boolean) => {
    propsBusy = true;
    store.update(
      (_d, page) => {
        const set = new Set(store.selection);
        page.elements.filter((e) => set.has(e.id)).forEach(fn);
      },
      { commit },
    );
    propsBusy = false;
  };
  const numField = (label: string, value: number, apply: (el: DesignElement, v: number) => void, opts: { step?: number; min?: number; max?: number } = {}) => {
    const input = h('input', { type: 'number', value: String(Math.round(value * 100) / 100), step: String(opts.step ?? 1) });
    if (opts.min !== undefined) input.min = String(opts.min);
    if (opts.max !== undefined) input.max = String(opts.max);
    const read = () => {
      let v = Number(input.value);
      if (!Number.isFinite(v)) return null;
      if (opts.min !== undefined) v = Math.max(opts.min, v);
      if (opts.max !== undefined) v = Math.min(opts.max, v);
      return v;
    };
    input.addEventListener('input', () => {
      const v = read();
      if (v !== null) live((el) => apply(el, v), false);
    });
    input.addEventListener('change', () => {
      propsBusy = true;
      store.commit();
      propsBusy = false;
    });
    return h('label', { class: 'field' }, h('span', {}, label), input);
  };
  const colorField = (label: string, value: string, apply: (el: DesignElement, v: string) => void) => {
    const color = h('input', { type: 'color', 'aria-label': label });
    if (/^#[0-9a-f]{6}$/i.test(value)) color.value = value;
    const hex = h('input', { class: 'hex mono', value, 'aria-label': `${label} hex` });
    color.addEventListener('input', () => {
      hex.value = color.value;
      live((el) => apply(el, color.value), false);
    });
    color.addEventListener('change', () => store.commit());
    hex.addEventListener('change', () => live((el) => apply(el, hex.value.trim()), true));
    return h('div', { class: 'field color' }, h('span', {}, label), h('div', { class: 'color-row' }, color, hex));
  };
  const selectField = (label: string, value: string, options: Array<[string, string]>, apply: (el: DesignElement, v: string) => void, styleFn?: (v: string) => string) => {
    const s = h('select', {}, ...options.map(([v, t]) => h('option', { value: v, style: styleFn ? styleFn(v) : undefined }, t)));
    s.value = value;
    s.addEventListener('change', () => live((el) => apply(el, s.value), true));
    return h('label', { class: 'field' }, h('span', {}, label), s);
  };
  const segmented = (value: string, options: Array<[string, string]>, apply: (v: string) => void) =>
    h('div', { class: 'segmented' }, ...options.map(([v, ico]) => {
      const b = iconButton(ico, v, () => apply(v), v === value ? 'active' : '');
      return b;
    }));
  const toggle = (label: string, on: boolean, apply: (v: boolean) => void) =>
    h('button', { class: `toggle ${on ? 'active' : ''}`, type: 'button', 'aria-pressed': String(on), onclick: () => apply(!on) }, label);

  const actionRow = () =>
    h('div', { class: 'action-row' },
      iconButton('up', 'Bring forward (Ctrl+])', () => actions.layer('forward')),
      iconButton('down', 'Send backward (Ctrl+[)', () => actions.layer('backward')),
      iconButton('top', 'Bring to front', () => actions.layer('front')),
      iconButton('bottom', 'Send to back', () => actions.layer('back')),
      iconButton('copy', 'Duplicate (Ctrl+D)', () => actions.duplicate()),
      iconButton('trash', 'Delete (Del)', () => actions.delete(), 'danger'),
    );

  const renderProps = () => {
    props.innerHTML = '';
    const els = store.selectedElements;
    if (!els.length) {
      props.append(
        h('h3', {}, 'Page'),
        h('div', { class: 'kv mono' }, h('span', {}, 'Size'), h('span', {}, `${W()} x ${H()} px`)),
        h('div', { class: 'kv mono' }, h('span', {}, 'Page'), h('span', {}, `${store.pageIndex + 1} of ${store.design.pages.length}`)),
        h('div', { class: 'kv mono' }, h('span', {}, 'Elements'), h('span', {}, String(store.page.elements.length))),
        h('p', { class: 'hint' }, 'Select an element on the canvas or in the layers list to edit it. Drag on an empty area to select several.'),
      );
      return;
    }
    if (els.length > 1) {
      props.append(h('h3', {}, `${els.length} elements`), actionRow(),
        numField('Opacity %', els[0].opacity * 100, (el, v) => (el.opacity = v / 100), { min: 0, max: 100 }));
      return;
    }
    const el = els[0];
    const title = h('h3', {}, el.name || el.type);
    props.append(title, actionRow());
    const grid = h('div', { class: 'field-grid' },
      numField('X', el.x, (e, v) => (e.x = v)),
      numField('Y', el.y, (e, v) => (e.y = v)),
    );
    if (el.type !== 'line' && el.type !== 'arrow') {
      grid.append(numField('W', (el as { width: number }).width, (e, v) => 'width' in e && (e.width = Math.max(4, v)), { min: 4 }));
      if (el.type !== 'text') grid.append(numField('H', (el as { height: number }).height, (e, v) => 'height' in e && (e.height = Math.max(4, v)), { min: 4 }));
    } else {
      grid.append(numField('Length', Math.hypot(el.points[2] - el.points[0], el.points[3] - el.points[1]), (e, v) => {
        if (e.type === 'line' || e.type === 'arrow') {
          const len = Math.hypot(e.points[2] - e.points[0], e.points[3] - e.points[1]) || 1;
          const k = Math.max(4, v) / len;
          e.points = [e.points[0], e.points[1], e.points[0] + (e.points[2] - e.points[0]) * k, e.points[1] + (e.points[3] - e.points[1]) * k];
        }
      }, { min: 4 }));
    }
    grid.append(
      numField('Rotate', el.rotation, (e, v) => (e.rotation = v), { min: -360, max: 360 }),
      numField('Opacity %', el.opacity * 100, (e, v) => (e.opacity = v / 100), { min: 0, max: 100 }),
    );
    props.append(grid);

    if (el.type === 'text') {
      props.append(
        h('h4', {}, 'Typography'),
        selectField('Font', el.fontFamily, FONT_FAMILIES.map((f) => [f, f]), (e, v) => e.type === 'text' && (e.fontFamily = v), (v) => `font-family:'${v}'`),
        h('div', { class: 'field-grid' },
          numField('Size', el.fontSize, (e, v) => e.type === 'text' && (e.fontSize = Math.max(4, v)), { min: 4, max: 2000 }),
          selectField('Weight', String(el.fontWeight), FONT_WEIGHTS.map((w) => [String(w), String(w)]), (e, v) => e.type === 'text' && (e.fontWeight = Number(v))),
          numField('Line height', el.lineHeight, (e, v) => e.type === 'text' && (e.lineHeight = v), { step: 0.05, min: 0.5, max: 4 }),
          numField('Spacing', el.letterSpacing, (e, v) => e.type === 'text' && (e.letterSpacing = v), { step: 0.5, min: -50, max: 200 }),
        ),
        colorField('Color', el.fill, (e, v) => e.type === 'text' && (e.fill = v)),
        h('div', { class: 'inline-row' },
          segmented(el.align, [['left', 'alignLeft'], ['center', 'alignCenter'], ['right', 'alignRight']], (v) => live((e) => e.type === 'text' && (e.align = v as 'left'), true)),
          toggle('Bold', el.fontWeight >= 700, (on) => live((e) => e.type === 'text' && (e.fontWeight = on ? 700 : 400), true)),
          toggle('Italic', el.italic, (on) => live((e) => e.type === 'text' && (e.italic = on), true)),
        ),
        h('button', { class: 'btn block', type: 'button', onclick: () => canvas.startTextEdit(el.id) }, 'Edit text'),
      );
    }
    if (el.type === 'rect' || el.type === 'ellipse' || el.type === 'star') {
      props.append(
        h('h4', {}, 'Fill and stroke'),
        colorField('Fill', el.fill, (e, v) => 'fill' in e && (e.fill = v)),
        colorField('Stroke', el.stroke, (e, v) => 'stroke' in e && (e.stroke = v)),
        numField('Stroke width', el.strokeWidth, (e, v) => 'strokeWidth' in e && (e.strokeWidth = v), { min: 0, max: 500 }),
      );
      if (el.type === 'rect') props.append(numField('Corner radius', el.cornerRadius, (e, v) => e.type === 'rect' && (e.cornerRadius = v), { min: 0, max: 2000 }));
      if (el.type === 'star')
        props.append(h('div', { class: 'field-grid' },
          numField('Points', el.numPoints, (e, v) => e.type === 'star' && (e.numPoints = Math.round(v)), { min: 3, max: 40 }),
          numField('Inner %', el.innerRatio * 100, (e, v) => e.type === 'star' && (e.innerRatio = v / 100), { min: 5, max: 100 }),
        ));
    }
    if (el.type === 'line' || el.type === 'arrow') {
      props.append(
        h('h4', {}, 'Stroke'),
        colorField('Color', el.stroke, (e, v) => 'stroke' in e && (e.stroke = v)),
        numField('Width', el.strokeWidth, (e, v) => 'strokeWidth' in e && (e.strokeWidth = v), { min: 1, max: 300 }),
      );
    }
  };

  // ---------- right: layers ----------
  let dragId: string | null = null;
  const typeLabel: Record<string, string> = { text: 'T', rect: 'RECT', ellipse: 'CIRC', star: 'STAR', line: 'LINE', arrow: 'ARRW', image: 'IMG' };
  const renderLayers = () => {
    layers.innerHTML = '';
    const list = h('ol', { class: 'layer-list' });
    const els = store.page.elements;
    const selected = new Set(store.selection);
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      const name = h('span', { class: 'layer-name', title: 'Double-click to rename' }, el.name || el.type);
      name.addEventListener('dblclick', () => {
        const input = h('input', { class: 'rename', value: el.name });
        name.replaceWith(input);
        input.focus();
        input.select();
        const done = () => store.update((_d, page) => { const t = page.elements.find((x) => x.id === el.id); if (t) t.name = input.value.trim() || t.type; });
        input.addEventListener('blur', done);
        input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') input.blur(); });
      });
      const row = h('li', {
        class: `layer ${selected.has(el.id) ? 'selected' : ''} ${el.visible ? '' : 'hidden'} ${el.locked ? 'locked' : ''}`,
        draggable: 'true',
        'data-id': el.id,
      },
        h('span', { class: 'layer-type mono' }, typeLabel[el.type]),
        name,
        iconButton(el.visible ? 'eye' : 'eyeOff', el.visible ? 'Hide' : 'Show', (e) => {
          e.stopPropagation();
          store.update((_d, page) => { const t = page.elements.find((x) => x.id === el.id); if (t) t.visible = !t.visible; });
        }),
        iconButton(el.locked ? 'lock' : 'unlock', el.locked ? 'Unlock' : 'Lock', (e) => {
          e.stopPropagation();
          store.update((_d, page) => { const t = page.elements.find((x) => x.id === el.id); if (t) t.locked = !t.locked; });
        }),
      );
      row.addEventListener('click', (e) => {
        if (e.shiftKey || e.metaKey || e.ctrlKey) store.select(selected.has(el.id) ? store.selection.filter((s) => s !== el.id) : [...store.selection, el.id]);
        else store.select([el.id]);
      });
      row.addEventListener('dragstart', (e) => {
        dragId = el.id;
        e.dataTransfer?.setData('text/plain', el.id);
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        row.classList.add('drop-target');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drop-target');
        if (!dragId || dragId === el.id) return;
        const id = dragId;
        dragId = null;
        store.update((_d, page) => moveToIndex(page, id, page.elements.findIndex((x) => x.id === el.id)));
      });
      list.append(row);
    }
    layers.append(
      h('h3', {}, 'Layers', h('span', { class: 'count mono' }, String(els.length))),
      els.length ? list : h('p', { class: 'hint' }, 'No elements on this page yet.'),
    );
  };

  // ---------- pages ----------
  const renderPages = () => {
    pagesBar.innerHTML = '';
    const tabs = h('div', { class: 'page-tabs' });
    store.design.pages.forEach((_p, i) => {
      tabs.append(h('button', { class: `page-tab mono ${i === store.pageIndex ? 'active' : ''}`, type: 'button', onclick: () => store.setPage(i) }, `Page ${i + 1}`));
    });
    pagesBar.append(
      tabs,
      h('div', { class: 'grow' }),
      h('button', { class: 'btn small', type: 'button', onclick: () => { let i = 0; store.update((d) => (i = addPage(d, createPage('#FFFFFF'), store.pageIndex + 1))); store.setPage(i); } }, icon('plus', 16), 'Add page'),
      h('button', { class: 'btn small', type: 'button', onclick: () => { let i = 0; store.update((d) => (i = duplicatePage(d, store.pageIndex))); store.setPage(i); } }, icon('copy', 16), 'Duplicate'),
      h('button', {
        class: 'btn small danger', type: 'button', disabled: store.design.pages.length <= 1, onclick: () => {
          if (store.design.pages.length <= 1) return;
          if (store.page.elements.length && !confirm(`Delete page ${store.pageIndex + 1}?`)) return;
          let i = 0;
          const at = store.pageIndex;
          store.update((d) => (i = deletePage(d, at)));
          store.setPage(i);
        },
      }, icon('trash', 16), 'Delete page'),
    );
  };

  const refreshChrome = () => {
    undoBtn.disabled = !store.history.canUndo;
    redoBtn.disabled = !store.history.canRedo;
    if (document.activeElement !== nameInput) nameInput.value = store.design.name;
    syncBg();
  };

  cleanups.push(
    store.onDesign(() => {
      if (!propsBusy) renderProps();
      renderLayers();
      renderPages();
      refreshChrome();
    }),
    store.onSelection(() => {
      renderProps();
      renderLayers();
    }),
    store.onCommit(refreshChrome),
  );
  renderProps();
  renderLayers();
  renderPages();
  refreshChrome();

  return {
    store,
    canvas,
    destroy() {
      window.clearTimeout(saveTimer);
      try {
        storage.save(store.design);
      } catch {
        /* ignore */
      }
      cleanups.forEach((c) => c());
      root.innerHTML = '';
    },
  };
}
