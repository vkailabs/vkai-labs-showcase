# VK AI Labs Showcase — Project Context

## What this is
A single-page, full-screen showcase website for "VK AI Labs — E2E Engineering Platform" —
a portfolio/demo piece presenting the VK AI Labs Insurance platform (dual-cloud, GCP + Azure,
built via multi-agent AI orchestration) to interviewers and clients. Six full-viewport slides:
Intro, AI Orchestration, Solution Architecture, Test Automation Framework, Verified in
Production (portal links + jump-to-demo card), and a live RAG Demo. No scrolling —
navigation only via a bottom-left "Next" button, clickable progress dots, arrow keys, or swipe.

## Tech stack — DO NOT introduce a frontend framework or build step
Frontend is plain HTML/CSS/JS only: index.html, styles.css, script.js. No npm dependencies,
no bundler, no React/Vue/etc. This is intentional — it deploys to Vercel as a static site with
zero build command and zero output directory config. Keep it that way unless explicitly told
otherwise.
**One deliberate exception:** `api/rag-query.js` is a Vercel serverless function (plain Node.js,
still zero npm dependencies — no framework there either). Vercel auto-detects any `.js` file
under `/api` as a function regardless of the rest of the project being static; this required no
config changes. Don't add a framework here either — the existing hand-rolled BM25 implementation
and direct `fetch()` call to the Anthropic API are intentional, matching the rest of the repo's
zero-dependency philosophy.

## Design language (must stay consistent with the rest of VK AI Labs)
- Near-black background (~#0a0e14), subtle radial gradient / faint dot-grid
- Fonts: 'Inter' for headlines/body, 'IBM Plex Mono' for eyebrows/labels/technical text
- Accent/glow color: teal (base #0f6e63, glow variant ~#14b8a6) — used for the Next button,
  active progress dot, headline accents, link-card hover states. This matches the "Master Agent"
  orchestrator color used across the other VK AI Labs diagrams — keep it consistent.
- Rounded corners (10-16px), soft glow shadows, confident large type on headlines
- Two of the three diagrams (Architecture, AI Orchestration) are LIGHT-themed images — they are
  always displayed inside a dark framed card (never pasted raw on the black background). The
  System Flow diagram is already dark-themed and sits directly on the page background, no frame.

## Assets — do not regenerate or re-touch
./assets/ contains three PNG diagrams exported from draw.io sources maintained in the main
VK AI Labs Insurance Claude Project (not this repo). These are the CORRECT, verified-clean
versions — earlier HTML-based versions of these diagrams had real layout bugs (clipped columns,
overlapping labels, text cut off by fixed-height containers) that were traced and confirmed via
headless-browser rendering, not just visual inspection. Always prefer the existing PNGs. If a
diagram ever needs to change, get a fresh export from the source Claude Project — don't try to
recreate or edit the PNGs directly, and don't reintroduce an HTML/SVG version without explicitly
checking it for overflow/clipping first (see "Known bug patterns" below).

## RAG Demo (Slide 6) — architecture, data, and constraints
Live retrieval-augmented generation demo, answering real questions grounded in this project's
own documentation (NOT this repo's own docs — the source content is the VK AI Labs Insurance
platform's docs, mirrored in here for the live function to read).

- **Pipeline:** Chunk (by markdown heading) → BM25 sparse index → retrieve top-k (currently 6)
  → Claude synthesizes an answer from only the retrieved chunks, told explicitly not to use
  outside knowledge.
- **Source of truth for the corpus:** `~/vkai-labs/insurance/ai/knowledge-base/` (a sibling
  project, NOT this repo) is where docs actually live and get chunked. `api/data/chunks.json`
  in THIS repo is a synced copy — regenerate it there (`chunk.py` + `embed_bm25.py`), then
  `cp` the result into `api/data/chunks.json` here. There is no automatic sync between the two;
  forgetting this step means the live demo silently serves stale content.
- **Retrieval logic duplication:** `api/rag-query.js` reimplements BM25 scoring and the exact
  same tokenizer/stopword list as the Python POC's `embed_bm25.py`, by hand, in JS — because
  Vercel functions run Node, not Python. If the tokenizer or stopword list ever changes in one,
  it must be changed in the other or retrieval quality will silently diverge between the local
  POC and the live demo.
- **Requires `ANTHROPIC_API_KEY`** as a Vercel environment variable (Settings → Environment
  Variables → Production). This is billed separately from any Claude subscription — prepaid
  usage credits via console.anthropic.com, roughly a cent or less per question at current
  pricing. Not free; if the demo ever starts erroring, check the Anthropic Console's credit
  balance before assuming it's a code bug (this has happened before — a valid key with zero
  balance returns a 400 from Anthropic, which surfaces as a 500 here).
- **No citation/source display, by deliberate choice** (not an oversight): earlier versions
  showed which doc chunks were used, but this was removed entirely — the API only returns
  `{ answer }`, and the frontend has no source-rendering code left. Do not re-add a `sources`
  field or citation UI without explicit direction; this was a considered removal, not a
  half-finished feature.
- **Model:** `claude-sonnet-4-6`, `max_tokens: 400`, so answers are intentionally short
  (2-4 sentences per the system prompt).

## Known bug patterns — check for these first if something seems "not clickable"
1. **Pointer-events trap**: an inactive slide or overlay element still in the DOM with
   opacity:0 but pointer-events:auto (or missing [hidden] display:none due to CSS specificity)
   will silently swallow clicks across the whole viewport while keyboard nav still works. If
   something responds to arrow keys but not mouse clicks, check element stacking/pointer-events
   FIRST before assuming it's a click-handler bug.
2. **:focus-visible is unreliable for programmatic .focus() calls**: this codebase moves focus
   to .slide-inner via JS after navigation for screen-reader accessibility. Do NOT rely on
   :focus-visible to hide the resulting outline on mouse-driven navigation — browser heuristics
   for this are inconsistent (confirmed: Chrome shows the ring even on click-driven focus).
   The correct, already-implemented pattern: a `user-is-tabbing` class added to <body> on Tab
   keydown and removed on any mousedown/touchstart, with focus outlines gated behind
   `body.user-is-tabbing` in CSS. Follow this same pattern for any new focusable element.
3. **Deck-level keyboard shortcuts trap keys inside form fields**: the global keydown listener
   for ArrowLeft/ArrowRight/PageUp/PageDown/Home/End (slide navigation) fires on ANY keypress
   by default — including while typing in the RAG demo's text input, where ArrowLeft/ArrowRight
   should move the text cursor, not change slides. Fixed via an `isTypingTarget()` check
   (INPUT/TEXTAREA/SELECT/contenteditable) that short-circuits the handler before slide nav
   runs. Any FUTURE focusable input added to this deck must be covered by that same check —
   it's not automatic, `isTypingTarget()` only checks tag name/contentEditable, so a custom
   widget (e.g. a div-based combobox) would need to be added to that check explicitly.

## Testing discipline
Always verify fixes with actual mouse clicks and actual keyboard presses — not just code review,
and not just Claude Code's sandboxed preview pane (which caps at ~612px width and cannot fully
verify wide desktop layouts, real new-tab navigation, or document.visibility-dependent behavior
like the intro canvas animation). When a fix touches click behavior, explicitly test: Next
button, progress dots, both diagram lightboxes (open + close), and both link cards — with a
real click, and report what elementFromPoint or computed styles actually showed, not just what
the code should do in theory.

## Git & deployment
- GitHub: vkailabs/vkai-labs-showcase (public repo)
- Deploy: Vercel, connected via GitHub integration, auto-deploys on every push to `main`.
  No build command, no output directory — it's a static site as-is.
- Live URL: https://vkai-labs-showcase.vercel.app
- Two portal links + the Live RAG Demo jump-card, referenced on slide 5 (do not change the
  portal URLs unless explicitly told):
  - Client Portal: https://vkai-insurance-client.vercel.app
  - Provider Portal: https://vkai-insurance-provider.vercel.app

### IMPORTANT — before every commit/push, verify git identity
This machine has multiple GitHub accounts configured. A wrong-account push has happened before.
Before running `git push`, ALWAYS run and check:
  gh auth status          → must show "vkailabs" as the ACTIVE account
  git config user.name    → must be "Vibhav Kulshrestha"
  git config user.email   → must be "vkailabs@gmail.com"
If any of these don't match, STOP and report it instead of proceeding with git operations.

## Workflow for any enhancement request
1. Read this file fully before starting any work.
2. Make the change, keeping the design language and no-framework constraint intact.
3. Test with real clicks/keypresses per "Testing discipline" above — report actual results,
   not assumptions.
4. Run the git identity checks above.
5. Stage, commit with a clear message describing what changed and why, push.
6. Report the commit hash, confirm push succeeded, and remind the user Vercel will
   auto-deploy within ~30-60 seconds — suggest they hard-refresh and verify live.
