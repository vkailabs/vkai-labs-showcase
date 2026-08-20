# VK AI Labs — E2E Engineering Platform (Showcase)

A single-page, full-screen keynote-style showcase for **VK AI Labs**, a dual-cloud
insurance platform where a master AI agent orchestrates nine specialized subagents —
from architecture through to production, verified live across GCP and Azure.

The page presents four full-viewport slides:

1. **Intro** — the pitch, tech stack, and an animated orchestration motif.
2. **The Platform** — four tiles covering Multi-Agent Orchestration, Solution
   Architecture, Test Automation Framework, and System Flow, plus links to the
   live Client and Provider portals.
3. **RAG in Practice** — a live retrieval-augmented generation demo, answering real
   questions grounded only in this project's own documentation (BM25 retrieval, no
   vector DB).
4. **Knowledge Graph** — a live interactive force-directed graph of the platform's
   real orchestration data (Stories, Scenarios, Test Cases, Agents — actual Jira
   keys) bridged to representative insurance records (Policies, Premiums, Claims),
   with a live traversal query panel.

Only one slide is visible at a time. Navigate with the bottom-left **Next** button,
the progress dots, the **←/→ arrow keys**, or by **swiping** on touch devices. The
light-themed diagrams sit in framed cards; every diagram opens in a zoom/pan
**lightbox** on click (Esc, the ✕, or a click outside closes it).

## Stack

Plain **HTML / CSS / JS** — no framework, no build step, no npm dependencies. Fonts
(Inter + IBM Plex Mono) load from Google Fonts. The Knowledge Graph slide's force-
directed visualization is hand-rolled vanilla JS/canvas — no charting library. The
RAG demo's backend (`api/rag-query.js`) is a Vercel serverless function, plain
Node.js, also with no framework. Everything else is local.

```
vkai-labs-showcase/
├── index.html
├── styles.css
├── script.js
├── api/
│   ├── rag-query.js
│   └── data/
│       └── chunks.json
├── assets/
│   ├── vkai-insurance-ai-orchestration-flow-v2.drawio.png
│   ├── vkai-insurance-ai-orchestration-v3.drawio.png
│   ├── vkai-insurance-solution-architecture-v3.drawio.png
│   ├── vkai-insurance-test-automation-framework-v2.drawio.png
│   ├── vkai-insurance-system-flow-v1.drawio.png
│   └── kg-graph.json
└── README.md
```

## Run it locally

The Knowledge Graph slide fetches its data via `fetch()`, which needs an actual
server — opening `index.html` directly as a `file://` URL will fail on that fetch
due to browser CORS restrictions on local files. Serve it instead:

```bash
npx serve .
```

Then visit the URL it prints (usually http://localhost:3000).

## Accessibility & preferences

- Full keyboard navigation with visible focus states and ARIA labels on all controls.
- Descriptive `alt` text on all diagrams.
- Respects `prefers-reduced-motion`: drift/fade and the animated background are
  disabled in favor of instant, minimal transitions.

## Deploy

Static site plus one Vercel serverless function (`api/rag-query.js`, auto-detected,
no config needed) — deployable as-is with no build command and no output directory
to set. The RAG demo additionally requires an `ANTHROPIC_API_KEY` environment
variable set in the Vercel project settings (Production).
