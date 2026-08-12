# VK AI Labs Showcase — Project Context

## What this is
A single-page, full-screen showcase website for "VK AI Labs — E2E Engineering Platform" —
a portfolio/demo piece presenting the VK AI Labs Insurance platform (dual-cloud, GCP + Azure,
built via multi-agent AI orchestration) to interviewers and clients. Four full-viewport slides:
Intro, Architecture, AI Orchestration, System Flow + live product links. No scrolling — 
navigation only via a bottom-left "Next" button and clickable progress dots.

## Tech stack — DO NOT introduce a framework or build step
Plain HTML/CSS/JS only. index.html, styles.css, script.js. No npm dependencies, no bundler,
no React/Vue/etc. This is intentional — it deploys to Vercel as a static site with zero build
command and zero output directory config. Keep it that way unless explicitly told otherwise.

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
- Two portal links referenced on slide 4 (do not change these unless explicitly told):
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
