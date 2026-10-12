// File input/output: downloads, PNG/PDF export, image import.
import { jsPDF } from 'jspdf';
import type { Design } from '../core/model';
import { serializeDesign } from '../core/serialize';
import { renderPageToDataURL } from './render';

export function safeFileName(name: string): string {
  return (name.trim() || 'design').replace(/[^a-z0-9-_ ]+/gi, '').replace(/\s+/g, '-').toLowerCase() || 'design';
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportPng(design: Design, pageIndex: number) {
  const url = await renderPageToDataURL(design, pageIndex, { pixelRatio: 2 });
  const suffix = design.pages.length > 1 ? `-page-${pageIndex + 1}` : '';
  downloadUrl(url, `${safeFileName(design.name)}${suffix}.png`);
}

export async function buildPdf(design: Design): Promise<jsPDF> {
  const { width: w, height: h } = design;
  const orientation = w > h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], hotfixes: ['px_scaling'], compress: true });
  for (let i = 0; i < design.pages.length; i++) {
    if (i > 0) pdf.addPage([w, h], orientation);
    const img = await renderPageToDataURL(design, i, { pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.92 });
    pdf.addImage(img, 'JPEG', 0, 0, w, h, undefined, 'FAST');
  }
  return pdf;
}

export async function exportPdf(design: Design) {
  const pdf = await buildPdf(design);
  pdf.save(`${safeFileName(design.name)}.pdf`);
}

export function exportJson(design: Design) {
  downloadBlob(new Blob([serializeDesign(design, true)], { type: 'application/json' }), `${safeFileName(design.name)}.ows.json`);
}

/** Reads an image file as a data URL, downscaling large images to keep autosave small. */
export function readImageFile(file: File, maxSide = 2000): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const original = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error('Not a supported image'));
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, maxSide / Math.max(w, h));
        if (scale === 1 || file.type === 'image/svg+xml' || file.type === 'image/gif') {
          resolve({ src: original, width: w || 400, height: h || 300 });
          return;
        }
        const c = document.createElement('canvas');
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        const type = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg';
        resolve({ src: c.toDataURL(type, 0.9), width: c.width, height: c.height });
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
