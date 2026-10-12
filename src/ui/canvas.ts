// Interactive Konva canvas: selection, transform, snapping guides, marquee and inline text editing.
import Konva from 'konva';
import type { DesignElement, TextElement } from '../core/model';
import type { Store } from '../core/store';
import { ensureFonts, fontStyle, getLoadedImage, loadImage, populateLayer, readNodeGeometry } from './render';

const SNAP_PX = 6;
const INK = '#0A0A0A';

export class CanvasEditor {
  readonly stage: Konva.Stage;
  private content = new Konva.Layer();
  private ui = new Konva.Layer();
  private tr: Konva.Transformer;
  private guides = new Konva.Group({ listening: false });
  private marquee = new Konva.Rect({ fill: 'rgba(255,214,10,0.15)', stroke: INK, strokeWidth: 1, visible: false, listening: false });
  zoom = 1;
  private editing: { el: TextElement; ta: HTMLTextAreaElement } | null = null;
  private pendingIds = new Set<string>();
  private pendingFlush = false;
  private onZoomChange: (z: number) => void;
  private unsubs: Array<() => void> = [];

  constructor(
    private readonly scroller: HTMLElement,
    private readonly mount: HTMLDivElement,
    private readonly store: Store,
    onZoomChange: (z: number) => void,
  ) {
    this.onZoomChange = onZoomChange;
    this.stage = new Konva.Stage({ container: mount, width: 100, height: 100 });
    this.tr = new Konva.Transformer({
      rotateAnchorOffset: 28,
      anchorSize: 9,
      anchorCornerRadius: 2,
      anchorStroke: INK,
      anchorFill: '#FFFFFF',
      borderStroke: INK,
      borderStrokeWidth: 1,
      padding: 0,
      ignoreStroke: true,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      rotationSnapTolerance: 4,
      boundBoxFunc: (oldBox, newBox) => (Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 4 ? oldBox : newBox),
    });
    this.ui.add(this.guides, this.tr, this.marquee);
    this.stage.add(this.content, this.ui);
    this.bindStage();
    this.unsubs.push(
      store.onDesign(() => this.render()),
      store.onSelection(() => this.syncTransformer()),
      store.onPage(() => this.fit()),
    );
    this.render();
  }

  destroy() {
    this.unsubs.forEach((u) => u());
    this.finishTextEdit();
    this.stage.destroy();
  }

  // ---------- zoom ----------
  setZoom(z: number) {
    this.zoom = Math.max(0.05, Math.min(8, z));
    const { width, height } = this.store.design;
    this.stage.size({ width: Math.round(width * this.zoom), height: Math.round(height * this.zoom) });
    this.stage.scale({ x: this.zoom, y: this.zoom });
    this.tr.anchorSize(9);
    this.stage.batchDraw();
    this.onZoomChange(this.zoom);
  }

  fit() {
    const { width, height } = this.store.design;
    const aw = Math.max(100, this.scroller.clientWidth - 96);
    const ah = Math.max(100, this.scroller.clientHeight - 96);
    this.setZoom(Math.min(aw / width, ah / height));
  }

  zoomBy(f: number) {
    this.setZoom(this.zoom * f);
  }

  // ---------- rendering ----------
  render() {
    if (this.editing) return;
    const { design } = this.store;
    const page = this.store.page;
    this.content.destroyChildren();
    populateLayer(this.content, design, page);
    for (const el of page.elements) {
      const node = this.content.findOne('#' + CSS.escape(el.id));
      if (node) this.bindNode(node as Konva.Shape, el);
      if (el.type === 'image' && !getLoadedImage(el.src)) {
        loadImage(el.src).then(() => this.render()).catch(() => undefined);
      }
    }
    this.syncTransformer();
    this.content.batchDraw();
    ensureFonts([page]).then((changed) => changed && this.render());
  }

  private nodeFor(id: string): Konva.Shape | undefined {
    return (this.content.findOne('#' + CSS.escape(id)) as Konva.Shape) ?? undefined;
  }

  syncTransformer() {
    if (this.editing) return;
    const els = this.store.selectedElements.filter((e) => !e.locked && e.visible);
    const nodes = els.map((e) => this.nodeFor(e.id)).filter((n): n is Konva.Shape => !!n);
    this.tr.nodes(nodes);
    const single = els.length === 1 ? els[0] : null;
    if (single?.type === 'text') {
      this.tr.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']);
      this.tr.keepRatio(true);
    } else if (single && (single.type === 'line' || single.type === 'arrow')) {
      this.tr.enabledAnchors(['middle-left', 'middle-right']);
      this.tr.keepRatio(false);
    } else {
      this.tr.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
      this.tr.keepRatio(single?.type === 'image');
    }
    this.ui.batchDraw();
  }

  private bindNode(node: Konva.Shape, el: DesignElement) {
    if (el.locked) {
      node.listening(false);
      return;
    }
    node.draggable(true);
    node.on('mousedown touchstart', (e) => {
      const multi = e.evt.shiftKey || (e.evt as MouseEvent).metaKey || (e.evt as MouseEvent).ctrlKey;
      const sel = this.store.selection;
      if (multi) {
        this.store.select(sel.includes(el.id) ? sel.filter((s) => s !== el.id) : [...sel, el.id]);
      } else if (!sel.includes(el.id)) {
        this.store.select([el.id]);
      }
    });
    node.on('dragmove', () => {
      if (this.tr.nodes().length <= 1) this.snap(node);
    });
    node.on('dragend', () => {
      this.clearGuides();
      for (const n of this.tr.nodes()) this.pendingIds.add(n.id());
      this.pendingIds.add(el.id);
      this.flushSoon();
    });
    node.on('transform', () => {
      if (el.type === 'text') {
        const anchor = this.tr.getActiveAnchor();
        if (anchor === 'middle-left' || anchor === 'middle-right') {
          node.width(Math.max(20, node.width() * node.scaleX()));
          node.scaleX(1);
        }
      }
    });
    node.on('transformend', () => {
      this.pendingIds.add(el.id);
      this.flushSoon();
    });
    if (el.type === 'text') {
      node.on('dblclick dbltap', () => this.startTextEdit(el.id));
    }
  }

  /** Batches geometry write-back so a multi-node drag or transform is one undo step. */
  private flushSoon() {
    if (this.pendingFlush) return;
    this.pendingFlush = true;
    queueMicrotask(() => {
      this.pendingFlush = false;
      const ids = [...this.pendingIds];
      this.pendingIds.clear();
      this.store.update((_d, page) => {
        for (const id of ids) {
          const el = page.elements.find((e) => e.id === id);
          const node = this.nodeFor(id);
          if (el && node) Object.assign(el, readNodeGeometry(node, el));
        }
      });
    });
  }

  // ---------- snapping ----------
  private snap(node: Konva.Shape) {
    const { width: W, height: H } = this.store.design;
    const thr = SNAP_PX / this.zoom;
    const box = node.getClientRect({ relativeTo: this.content });
    const vt = [0, W / 2, W];
    const ht = [0, H / 2, H];
    for (const other of this.content.find('.element')) {
      if (other === node || !other.visible()) continue;
      const r = other.getClientRect({ relativeTo: this.content });
      vt.push(r.x, r.x + r.width / 2, r.x + r.width);
      ht.push(r.y, r.y + r.height / 2, r.y + r.height);
    }
    const best = (edges: number[], targets: number[]) => {
      let res: { d: number; t: number } | null = null;
      for (const e of edges)
        for (const t of targets) {
          const d = t - e;
          if (Math.abs(d) < thr && (!res || Math.abs(d) < Math.abs(res.d))) res = { d, t };
        }
      return res;
    };
    const sx = best([box.x, box.x + box.width / 2, box.x + box.width], vt);
    const sy = best([box.y, box.y + box.height / 2, box.y + box.height], ht);
    this.guides.destroyChildren();
    const sw = 1 / this.zoom;
    if (sx) {
      node.x(node.x() + sx.d);
      this.guides.add(new Konva.Line({ points: [sx.t, 0, sx.t, H], stroke: INK, strokeWidth: sw, dash: [4 * sw, 4 * sw] }));
    }
    if (sy) {
      node.y(node.y() + sy.d);
      this.guides.add(new Konva.Line({ points: [0, sy.t, W, sy.t], stroke: INK, strokeWidth: sw, dash: [4 * sw, 4 * sw] }));
    }
    this.ui.batchDraw();
  }

  private clearGuides() {
    this.guides.destroyChildren();
    this.ui.batchDraw();
  }

  // ---------- empty-area click + marquee ----------
  private bindStage() {
    this.stage.on('mousedown touchstart', (e) => {
      const t = e.target;
      const onEmpty = t === this.stage || t.hasName('background');
      if (!onEmpty) return;
      const additive = e.evt.shiftKey || (e.evt as MouseEvent).metaKey || (e.evt as MouseEvent).ctrlKey;
      const start = this.content.getRelativePointerPosition();
      if (!start) return;
      const base = additive ? [...this.store.selection] : [];
      if (!additive) this.store.select([]);
      let moved = false;
      const move = (ev: PointerEvent | MouseEvent) => {
        this.stage.setPointersPositions(ev);
        const p = this.content.getRelativePointerPosition();
        if (!p) return;
        const x = Math.min(start.x, p.x);
        const y = Math.min(start.y, p.y);
        const w = Math.abs(p.x - start.x);
        const h = Math.abs(p.y - start.y);
        if (w * this.zoom > 3 || h * this.zoom > 3) moved = true;
        this.marquee.setAttrs({ x, y, width: w, height: h, visible: moved, strokeWidth: 1 / this.zoom });
        this.ui.batchDraw();
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        if (moved) {
          const box = this.marquee.getClientRect({ relativeTo: this.content });
          const hits = this.store.page.elements
            .filter((el) => el.visible && !el.locked)
            .filter((el) => {
              const n = this.nodeFor(el.id);
              return n && Konva.Util.haveIntersection(box, n.getClientRect({ relativeTo: this.content }));
            })
            .map((el) => el.id);
          this.store.select([...new Set([...base, ...hits])]);
        }
        this.marquee.visible(false);
        this.ui.batchDraw();
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
  }

  // ---------- inline text editing ----------
  startTextEdit(id: string) {
    const el = this.store.page.elements.find((e) => e.id === id);
    const node = this.nodeFor(id);
    if (!el || el.type !== 'text' || !node || el.locked) return;
    this.finishTextEdit();
    this.store.select([id]);
    this.tr.nodes([]);
    this.ui.batchDraw();
    node.hide();
    this.content.batchDraw();
    const z = this.zoom;
    const pos = node.getAbsolutePosition();
    const ta = document.createElement('textarea');
    ta.className = 'text-editor';
    ta.value = el.text;
    ta.spellcheck = false;
    ta.rows = 1;
    Object.assign(ta.style, {
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      width: `${el.width * z}px`,
      font: `${fontStyle(el)} ${el.fontSize * z}px "${el.fontFamily}", sans-serif`,
      lineHeight: String(el.lineHeight),
      letterSpacing: `${el.letterSpacing * z}px`,
      color: el.fill,
      textAlign: el.align,
      transform: `rotate(${el.rotation}deg)`,
      opacity: String(el.opacity),
    });
    this.mount.appendChild(ta);
    const grow = () => {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight + 2}px`;
    };
    grow();
    ta.addEventListener('input', grow);
    ta.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey))) {
        ev.preventDefault();
        this.finishTextEdit();
      }
    });
    ta.addEventListener('blur', () => this.finishTextEdit());
    this.editing = { el, ta };
    ta.focus();
    ta.select();
  }

  finishTextEdit() {
    const ed = this.editing;
    if (!ed) return;
    this.editing = null;
    const value = ed.ta.value;
    ed.ta.remove();
    this.store.update((_d, page) => {
      const el = page.elements.find((e) => e.id === ed.el.id);
      if (el && el.type === 'text') el.text = value;
    });
    this.render();
  }

  get isEditingText() {
    return !!this.editing;
  }
}
