# CLAUDE.md — Recall Project Memory

> Last updated: 2026-03-23
> This file is the authoritative context document for Claude across all sessions.

---

## Project Overview

**Recall** is a spaced-repetition learning system with three components:

| Component | Stack | Purpose |
|---|---|---|
| Chrome Extension (MV3) | Vanilla JS, `chrome.storage.local`, IndexedDB | Popup UI, card generation flow, content widget |
| Web Dashboard (`recall-web`) | Next.js App Router, Tailwind v4, shadcn/ui, Framer Motion, Recharts | Auth, sources, cards, progress, retention analytics |
| Backend | Next.js API routes, MongoDB/Mongoose, Gemini API | AI pipeline, SM-2 persistence, auth |

---

## Architecture

### Storage Model
- **Runtime/cache**: `chrome.storage.local` — SM-2 state (`recallSM2State`), widget cards, session flags
- **Offline fallback**: IndexedDB (`RecallExtensionDB`) — auth token, user, cards, calibration state
- **Persistence**: MongoDB `UserProgress` — SM-2 state, today stats, ghost card flags, seenFirstCardPerSource
- **Sync strategy**: queue-and-sync; `recallSyncPending` flag gates all pushes; pull on login, push on idle

### SM-2
- Computation is **fully client-side** (`popup-sm2.js`, `widget-shared.js`)
- State keyed by `cardId` in flat map `recallSM2State`
- `recallSyncPending: true` must be set after **every** SM-2 write including calibration

### API Pipeline
- Three Gemini agents: quality check + enrichment → MCQ generation → short cards
- Fire-and-forget via `runAgents()` — no Redis/BullMQ
- Source status polling: `pending → processing → done/failed`

### Cross-Layer Storage Keys (audit these carefully)
```
recallSM2State          → chrome.storage.local
recallWidgetCards       → chrome.storage.local
recallExamDate          → chrome.storage.local + IndexedDB (mirror both)
recallLastSourceId      → chrome.storage.local + IndexedDB (mirror both)
recallAuthToken         → IndexedDB + chrome.storage.local bridge
recallUser              → IndexedDB + chrome.storage.local bridge
recallCalibrationCompleted → IndexedDB
recallCards             → IndexedDB
recallTopic             → IndexedDB
ghostCardShown          → chrome.storage.local
seenFirstCardPerSource  → chrome.storage.local
recallTodayStats        → chrome.storage.local
recallSyncPending       → chrome.storage.local
recallWidgetDndMode     → chrome.storage.local
recallWidgetPosition    → chrome.storage.local
recallWidgetDotPosition → chrome.storage.local
```

### Card Annotation Requirements
Every card in `recallWidgetCards` and `recallCards` **must** carry:
- `topic` — for widget greeting and topic color
- `sourceId` — for SM-2 grouping and ghost card logic

Without these, raw ObjectIds appear in the widget and topic color hashing breaks.

---

## Extension Structure

```
extension/
  manifest.json
  popup/
    popup.html
    popup.css
  scripts/
    config.js                      ← API URL config (production/dev)
    popup/
      popup-sm2.js
      popup-storage.js
      popup-text-utils.js
      popup.js
    widget/
      widget-shared.js
      widget-runtime.js
      widget-storage.js
      widget-ui.js
      widget-card-render-helpers.js
      content-widget.js
```

---

## Dashboard Structure (`recall-web`)

```
app/
  dashboard/page.tsx               ← Main dashboard (single-page, tab-based)
  api/
    auth/{login,register,google}/
    sources/route.ts
    sources/[sourceId]/{route,cards,status}/
    cards/[cardId]/route.ts
    progress/route.ts
    check-answer/route.ts
    dashboard-data/route.ts
components/
  ui/{badge,button,card,input}.tsx
  BackendSnapshot.tsx
  CardsPanel.tsx
  SourcesTable.tsx
  RetentionChart.tsx
  Navbar.tsx
  Sidebar.tsx
  landing/DashboardPreview.tsx
models/
  User.ts / Source.ts / Card.ts / UserProgress.ts
lib/
  auth.ts / mongoose.ts / agents.ts / sources.helpers.ts / utils.ts
```

---

## Key Technical Decisions

### Tailwind v4
- Theme tokens live in `@theme {}` block inside `globals.css` — **not** in `tailwind.config.js`
- `theme.extend` in JS config is ignored entirely in v4
- shadcn/ui v3 components require migration before use in v4 projects

### Chart.js Null Handling
- `null` renders as `0` in Chart.js v4, not a gap
- Convert `null → NaN` for sparse retention curves; use `spanGaps: true`

### Answer Checking
- Two-tier: Levenshtein fuzzy match (threshold 0.8) → Gemini semantic fallback (`POST /api/check-answer`)
- Semantic check is best-effort; falls back to `false` on network error

### Ebbinghaus Retention Curve
- Day bucketing uses `dayEndMs = dayMs + 86399999` (not midnight) to avoid excluding same-day reviews
- Formula: `Math.exp(-t / S) * 100` where S = interval in days, t = elapsed days

### Widget Idle Logic
- Idle threshold: 5000ms; check interval: 500ms
- Widget shown on idle; auto-advances to next card if current card already answered
- Queue completed → hide widget → schedule refresh timer for next due card

---

## Known Issues & Fixes Applied

| Issue | Fix |
|---|---|
| Tailwind v4 ignores JS config tokens | Moved all tokens to `@theme {}` in `globals.css` |
| Turbopack hang on `/dashboard` | Added `turbopack.root: __dirname` in `next.config.ts`; deleted duplicate `postcss.config.js` |
| Dashboard loading bug | `token` state initialized as `null` caused permanent load block; fixed with `|| ""` fallback and relative API paths |
| `recallExamDate`/`recallLastSourceId` cross-layer mismatch | Written to IndexedDB but read from `chrome.storage.local`; now mirrored to both layers in `popup.js` |
| Card annotation missing | Cards now always have `topic` and `sourceId` injected before saving to `recallWidgetCards` |
| Chrome Extension Google OAuth 500 error | `tokeninfo` endpoint doesn't return `email` for extension tokens; switched to `userinfo` endpoint which does; also use `userInfo.sub` as verified googleId |

---

## Deployment — Google OAuth & Production API (added 2026-03-23)

### Problem
All API URLs were hardcoded to `http://localhost:3000`. This breaks when the dashboard
is deployed (e.g. Vercel) and the extension is published to the Chrome Web Store.

### Solution Applied
1. **`extension/scripts/config.js`** — new file; exposes `window.RecallConfig.API_BASE_URL` and `window.RecallConfig.DASHBOARD_URL`
2. **`manifest.json`** — `host_permissions` extended to include production domain; `config.js` added as first content script
3. **`popup.html`** — loads `config.js` before all other scripts
4. **`popup.js`** — `API_BASE_URL` and `DASHBOARD_URL` read from `window.RecallConfig` with localhost fallback
5. **`widget-runtime.js`** — `semanticMatch` reads URL from `window.RecallConfig`
6. **`content-widget.js`** — `pushProgressToServer` reads URL from `window.RecallConfig`
7. **`next.config.ts`** — CORS headers added for `chrome-extension://` origins on all `/api/*` routes

### Manual Steps (Google Cloud Console)
- OAuth credential type must be **Chrome Extension** (not Web application)
- Published extension ID must be registered in the credential's **Application ID** field
- Create a separate dev credential with the unpacked extension ID for local testing
- Each build variant uses its corresponding `client_id` in `manifest.json`

### Files Changed
```
extension/scripts/config.js          (new)
extension/manifest.json              (host_permissions, content_scripts, CSP)
extension/popup/popup.html           (script load order)
extension/scripts/popup/popup.js     (API_BASE_URL, DASHBOARD_URL)
extension/scripts/widget/widget-runtime.js   (semanticMatch URL)
extension/scripts/widget/content-widget.js   (pushProgressToServer URL)
recall-web/next.config.ts            (CORS headers)
```

---

## Implementation Approach

- **Primary tool**: GitHub Copilot — Claude produces copy-paste-ready prompts with exact file targets
- **Claude's role**: architecture review, debugging, prompt generation, CLAUDE.md maintenance
- **Preferred output**: phase-by-phase plans with Copilot prompts and verification checklists
- **Verbosity**: concise; no unnecessary prose

---

## On the Horizon

- Pull-on-login flow to repopulate local card cache on new devices (gap identified, not yet implemented)
- Dashboard UI migration to match Lovable prototype (Phases 1–4 plan exists; verify implementation)
- Study Reels, Dashboard v2, monetization
- Production deployment (Vercel + Chrome Web Store submission)
- Full real-time quiz module (lobby sessions, leaderboards, gamification) — Commudle direction

---

## Commit Convention

```
feat: description
fix: description
chore: description
docs: description (CLAUDE.md updates)
```

---

## Suggested Commit Message for This Change

```
fix: add production API config and Google OAuth deployment support

- Add extension/scripts/config.js for runtime API URL injection
- Extend manifest.json host_permissions to include production domain
- Load config.js first in content scripts and popup
- Replace hardcoded localhost URLs in popup.js, widget-runtime.js, content-widget.js
- Add CORS headers for chrome-extension:// origins in next.config.ts
- Document Google Cloud Console OAuth credential requirements

Closes: Google OAuth production deployment issue
```
