# VK AI Labs — E2E Engineering Platform (Showcase)

A single-page, full-screen keynote-style showcase for **VK AI Labs**, a dual-cloud
insurance platform where a master AI agent orchestrates four specialized subagents —
from architecture through to production, verified live across GCP and Azure.

The page presents four full-viewport slides:

1. **Intro** — the pitch, tech stack, and an animated orchestration motif.
2. **Solution Architecture** — the two-cloud, zero-shared-database design.
3. **AI Orchestration** — the master-agent / four-subagent workflow.
4. **System Flow + Live Links** — the end-to-end production flow plus links to the
   live Client and Provider portals.

Only one slide is visible at a time. Navigate with the bottom-left **Next** button,
the progress dots, the **←/→ arrow keys**, or by **swiping** on touch devices. The
two light-themed diagrams sit in framed cards; every diagram opens in a
zoom/pan **lightbox** on click (Esc, the ✕, or a click outside closes it).

## Stack

Plain **HTML / CSS / JS** — no framework, no build step, no npm dependencies. Fonts
(Inter + IBM Plex Mono) load from Google Fonts. Everything else is local.

```
vkai-labs-showcase/
├── index.html
├── styles.css
├── script.js
├── assets/
│   ├── vkai-insurance-solution-architecture-v2.drawio.png
│   ├── vkai-insurance-ai-orchestration.drawio.png
│   └── vkai-insurance-system-flow-v1.drawio.png
└── README.md
```

## Run it locally

Just open the file — no server required:

```bash
open index.html
```

Or serve it (handy for exact-path parity with production):

```bash
npx serve .
```

Then visit the URL it prints (usually http://localhost:3000).

## Accessibility & preferences

- Full keyboard navigation with visible focus states and ARIA labels on all controls.
- Descriptive `alt` text on all three diagrams.
- Respects `prefers-reduced-motion`: drift/fade and the animated background are
  disabled in favor of instant, minimal transitions.

## Deploy

Static site — deployable as-is with no configuration. On **Vercel**, point a new
project at the repo root; there is no build command and no output directory to set.
The same holds for Netlify, GitHub Pages, Cloudflare Pages, or any static host.
