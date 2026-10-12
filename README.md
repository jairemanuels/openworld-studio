# openworld studio

A free, open-source graphic design editor that runs entirely in your browser. Make social posts, posters, slides, business cards and thumbnails from a blank canvas or a template, then export to PNG or PDF. No account, no server: your designs are saved in your browser.

openworld studio is an open-source alternative to tools like Canva, built from scratch with its own design, code and templates.

**Live demo:** https://jairemanuels.github.io/openworld-studio/

## Features

- **Start screen** with blank canvas presets (Instagram post 1080x1080, Story 1080x1920, A4 portrait, Presentation 1920x1080, video thumbnail, business card), a custom size form, and seven original templates built only from shapes and text: launch night poster, weekend sale post, quote card, two-page presentation, two-sided business card, video thumbnail and a story announcement.
- **Text**: heading, subheading and body presets; edit inline on double-click; 12 open-license Google Fonts (Geist, Geist Mono, Inter, Space Grotesk, Montserrat, Poppins, Oswald, Bebas Neue, Playfair Display, DM Serif Display, Lora, JetBrains Mono); size, weight, italic, color, alignment, line height and letter spacing.
- **Shapes**: rectangle, rounded rectangle, circle/ellipse, line, arrow and star, with fill, stroke, corner radius and star points.
- **Images**: upload with the file picker, drag and drop onto the canvas, or paste from the clipboard. Large images are downscaled to keep projects light.
- **Page background** color with swatches and hex input.
- **Selection and transform**: move, resize and rotate with handles (rotation snaps to 45 degrees), shift-click or marquee multi-select, numeric X/Y/W/H/rotation/opacity fields.
- **Snapping** to canvas edges and center and to other elements, with visible guides.
- **Editing shortcuts**: delete, duplicate (Ctrl/Cmd+D), copy/cut/paste, arrow-key nudge (Shift for 10 px), select all, forward/backward (Ctrl/Cmd+] and [).
- **Layers panel**: drag to reorder, rename, show/hide, lock/unlock, bring to front/send to back.
- **Undo/redo** (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y) for every change, including page operations.
- **Zoom**: fit to screen, zoom in/out buttons, Ctrl/Cmd+scroll.
- **Multiple pages** per design: add, duplicate and delete pages.
- **Autosave** to localStorage, with a list of recent designs (with thumbnails) on the start screen.
- **Import/export** designs as JSON (`.ows.json`, validated on import).
- **Export** the current page as PNG at 2x, or all pages as a multi-page PDF.

## Local development

Requires Node 20 or newer.

```bash
npm install
npm run dev       # start the dev server
npm test          # run the unit tests (vitest)
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
npm run deploy    # build and publish dist/ to the gh-pages branch
```

## Tech stack

- [Vite](https://vitejs.dev/) and TypeScript, no UI framework
- [Konva](https://konvajs.org/) for the canvas, transformer handles and rendering
- [jsPDF](https://github.com/parallax/jsPDF) for PDF export
- [Vitest](https://vitest.dev/) for unit tests of the non-visual core (undo history, serialization, storage, page and layer operations, templates)
- Fonts from Google Fonts under the SIL Open Font License

### Project layout

```
src/core/     data model, undo history, store, serialization, storage, templates (no DOM)
src/ui/       Konva rendering, canvas interactions, editor and start screens, export
tests/        vitest suites for src/core
```

## Roadmap

- Real-time collaboration and shareable links
- More templates and a template gallery contributed by the community
- AI background removal for images, running locally in the browser
- Grouping, alignment and distribution tools
- Gradients, shadows and image filters
- SVG export and transparent PNG export
- Brand kits with saved colors and fonts
- Touch and tablet friendly controls

## License

[MIT](./LICENSE), copyright 2026 Jaïr Emanuels / Nodient.

## Not affiliated with Canva

openworld studio is an independent project with no affiliation, endorsement or sponsorship by Canva Pty Ltd. All trademarks belong to their respective owners.
