# VK AI Labs Showcase — Project Context

## What this is
A single-page, full-screen showcase website for "VK AI Labs — E2E Engineering Platform" —
a portfolio/demo piece presenting the VK AI Labs Insurance platform (dual-cloud, GCP + Azure,
built via multi-agent AI orchestration) to interviewers and clients. Four full-viewport slides:

1. **Intro** — the pitch, tech stack, animated orchestration motif.
2. **The Platform (hub)** — four tiles covering Multi-Agent Orchestration, Solution
   Architecture, Test Automation Framework, and System Flow, plus links to the live Client
   and Provider portals.
3. **RAG in Practice** — live retrieval-augmented generation demo, grounded in this
   project's own documentation.
4. **Knowledge Graph** — live interactive force-directed graph of the platform's real
   Story/Scenario/TestCase/Agent orchestration data bridged to representative
   Policy/Premium/Claim insurance records, with a live traversal query panel.

No scrolling — navigation only via a bottom-left "Next" button, clickable progress dots,
arrow keys, or swipe.

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

## RAG Demo (Slide 3) — architecture, data, and constraints
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
- **Retrieval is BM25-only here, by deliberate decision — NOT a gap to fill in later.**
  The local POC (`~/vkai-labs/insurance/ai/`) also supports hybrid retrieval (BM25 + dense
  embeddings via `sentence-transformers`, auto-enabled once `embeddings.json` exists) and this
  was confirmed to meaningfully improve retrieval quality on real failing queries there. It was
  deliberately NOT brought to this live demo: doing so would require either (a) a real npm
  dependency to run a transformer model in the Vercel function, breaking this repo's
  zero-dependency rule above, or (b) a hosted embeddings API (e.g. Voyage AI) — a new external
  account/API key/secret for a demo-scale project. Both were considered and explicitly declined
  in favor of keeping this repo simple. If retrieval quality on the live demo ever becomes a
  real problem (not just a known limitation), Voyage AI was the preferred path if revisited —
  don't reach for a JS-bundled model first.

## Knowledge Graph Demo (Slide 4) — architecture, data, and constraints
Live interactive force-directed graph of this platform's real orchestration data
(Story/Scenario/TestCase/Agent — actual Jira keys and real orchestration edges) bridged to
representative insurance domain data (Customer/Policy/Premium/Claim), with a live traversal
query panel proving graph queries actually resolve against the rendered data, not canned
answers.

- **Source of truth:** `~/vkai-labs/insurance/ai/kg/` (a sibling project, NOT this repo) is
  where the graph is actually built — NetworkX, Python, `graph_data.py` → `build_graph.py` →
  `kg_graph.json`. `assets/kg-graph.json` in THIS repo is a synced, trimmed export (node-link
  format, JS-friendly field names) — regenerate the source graph there, then re-export and `cp`
  the result into `assets/kg-graph.json` here. Same manual-sync caveat as the RAG corpus: there
  is no automatic sync between the two; forgetting this step means the live demo silently serves
  stale graph data.
- **Rendering: zero-dependency vanilla JS/canvas** — no charting library, no CDN script. This is
  *stricter* than the RAG demo's own zero-dependency rule (RAG at least calls an external
  Anthropic API from its serverless function; this slide has no server calls at all — the whole
  graph and every traversal query run entirely client-side against the static JSON asset).
- **Force-directed layout is computed at runtime**, not precomputed positions in the data file.
  Repulsion/spring constants scale with the canvas's actual width/height at layout time
  (`k = sqrt(area / n)`, standard Fruchterman-Reingold "ideal distance" technique) rather than
  being fixed numbers — this was a real bug fix (see Known bug patterns below): fixed constants
  tuned for one canvas size left nodes clustered in the middle once the canvas was resized.
- **Query panel is a fixed set of 4 traversal types**, not click-to-explore: test cases for a
  Story, claims for a Policy, agents for a Story, policies for a Customer. This was a deliberate
  choice over open-ended node-clicking — for an interview/client audience, a guided "watch this
  resolve a real question" demo is more reliable and tells a clearer story than an exploratory
  tool that puts the burden of figuring out what to click on the viewer. Do not add click-to-
  explore without explicit direction; this was a considered scope decision, not a shortcut.
- **`COVERS` edges are a deliberate modeling bridge, not raw source data**: each test Scenario
  connects to exactly ONE representative Policy/Premium/Claim instance (keyed by its test
  module), not every instance of that entity type. An earlier type-wide fan-out version made
  every scenario visually "cover" all 2-3 records of a type, which was both visually noisy and
  semantically misleading. Rendered as dashed lines, distinct from the solid lines used for real
  orchestration/business edges (`HAS_SCENARIO`, `VERIFIED_BY`, `RELATES_TO`, `IMPLEMENTED`,
  `CLOSED`, `AUTHORED`, `OWNS`, `HAS_PREMIUM`, `HAS_CLAIM`).
- **Data is a mix of real and synthetic, by design**: Agent/Story/Scenario/TestCase nodes and
  their edges are 100% real, pulled directly from this project's actual Jira history and
  orchestration setup log. Customer/Policy/Premium/Claim nodes are synthetic, schema-accurate
  representative records (no live DB connection — this is a standalone POC, same "no new infra"
  principle as the RAG POC). Do not present the insurance-domain records as real customer data.
- **A real traversal bug was caught and fixed here** — not a designed-in feature, worth knowing
  if extending the query set further: the first version of "agents for a story" only walked
  direct Story→Agent edges and under-reported real results, because 2 of the real agents involved
  (`agent-vkai-automation`, `agent-vkai-jira-update`) work at the Test Case level, not the Story
  level directly. Fixed by also traversing through a Story's linked Test Cases. If adding new
  query types, check the real orchestration workflow (this repo's sibling project's setup log)
  for which relation level an agent actually operates at — don't assume direct-edges-only is
  sufficient.

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
4. **Canvas sizing on `hidden` elements returns 0×0**: any `<canvas>` inside a slide that starts
   with the HTML `hidden` attribute (all slides except Slide 1 on page load) will measure
   `clientWidth`/`clientHeight` as `0` if sized before the slide is ever shown, silently
   collapsing all content to a point. Size/lay out canvas content only once the slide is
   confirmed active (watch for the `is-active` class via `MutationObserver`, same pattern as the
   Slide 1 orchestration-motif canvas), not on page load or data-fetch-complete alone.
5. **DOM-mutation timing races vs. actual settled layout**: a `MutationObserver` watching a class
   change fires the instant the class changes, not once the browser has actually finished
   computing final layout — this caused inconsistent canvas hit-testing on the Knowledge Graph
   slide (worked in sparse areas, not in dense clusters) because sizing ran a frame before layout
   had settled. If something depends on an element's real rendered size (not just visibility),
   prefer `ResizeObserver` on that element over `MutationObserver` on a class/attribute.
6. **`overflow: hidden` containers clip more than you'd expect**: a tooltip or overlay positioned
   `absolute` inside a container with `overflow: hidden` (needed for that container's own clean
   edges) will get silently clipped whenever it lands near that container's border. If an overlay
   needs to escape its parent's clipping, use page-level `position: fixed` with viewport
   coordinates (`e.clientX`/`clientY`) instead of container-relative offsets.

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
