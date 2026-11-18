# NORDIX — React + TypeScript + Vite

Educational site for industrial refrigeration, electrical installation and compressor technology.

## Run locally

```bash
npm install
npm run dev
```

Open the local address displayed by Vite (base path: `/NORDIX/`).

Build: `npm run build`. Browser regression tests: `npx playwright install chromium && npm run test:e2e`.

## Migration safety

- `backup/NORDIX_original.html`: an unchanged copy of the supplied single-page site.
- `public/closing.svg`: **original SVG artwork**, extracted without modifying its paths.
- `src/sections/*.html`: original page sections split into manageable files.
- `src/App.tsx`: React section components retaining the original markup and DOM layout.
- `src/styles.css`: original CSS without restyling.
- `public/scripts/*.js`: original interactions loaded after React mounts the HTML.
- `tests/site.spec.ts`: browser tests for sections, course filters, modal, calculator, FAQ and mobile menu.

This is a **visual-preservation migration stage**, not a full rewrite of every element into JSX. The compatibility layer lets us progressively rebuild each component using native React state without changing the approved design.

The existing project still relies on Google Fonts, Tailwind CDN, Lucide CDN and the original external logo URL. Moving those assets locally is a later, separately testable task.

**The default `main` branch is not changed during migration.**
