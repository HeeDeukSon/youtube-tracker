# dev-log.md — YouTube Tracker Project

> All technical decisions, architectural changes, and status updates are recorded here cumulatively.

---

## Phase 1 — Foundation & Core Tracker

### [Early Stage] Initial Build
**Date:** Pre-2026-04-28
**Status:** ✅ Complete

**Summary:**
Built a YouTube-based English learning channel tracker from the ground up.

- Defined a target channel list of 47 channels across 4 categories: AI, Language Learning, Training, Negotiation (`youtube-tracker.txt`)
- Implemented `tracker.js` to fetch video metadata via YouTube Data API v3 (titles, views, likes, comments, thumbnails, descriptions)
- Added `channel_ids.json` as a local cache to avoid expensive `search.list` API calls on repeated runs
- Built `generate-html.js` to produce an interactive single-page HTML dashboard (`report.html`) with all channel/video data embedded
- Added `generate-report.js` for a lightweight ASCII text summary
- Added `patch.js` for tag enrichment (category mappings applied post-fetch)
- Stored `results.json` in Git intentionally as a data fallback, preventing a broken fetch from wiping the deployed dashboard
- Configured GitHub Actions (`.github/workflows/update.yml`) to run every Monday at 09:00 UTC with a >80% data integrity check and automatic rollback

**Key Design Decision:**
`results.json` is tracked in version control as a "last known good" snapshot. If a weekly fetch returns fewer than 80% of expected records, the workflow restores the previous snapshot rather than deploying corrupt data.

---

## Phase 2 — UI Stability Improvements

### [2026-04-28 ~] HTML Report Fixes
**Date:** ~2026-04-28 (multiple commits)
**Status:** ✅ Complete

**Summary:**
Resolved a series of rendering and interaction bugs in `generate-html.js`:

- Fixed event listener accumulation causing duplicate handlers on re-render
- Fixed description toggle: scrollable box, visible button, correct text/escape behavior
- Fixed `renderDesc` regex broken by template literal backslash escaping
- Made description URLs clickable (matching YouTube behavior)
- Removed 300px height cap on expanded descriptions — now shows full script

---

## Phase 3 — Security Hardening & Infrastructure

### [2026-04-28] Environment Variable Architecture
**Date:** 2026-04-28
**Status:** ✅ Complete

**Rationale:**
Prior to this phase, API keys lived only in a local `.env` file (gitignored, but unencrypted on disk). There was no centralized env management, and upcoming features (GA4, AI integrations) would add more secrets. A controlled infrastructure was needed before any new API work began.

**Changes made:**

| File | Action | Detail |
|------|--------|--------|
| `.gitignore` | Updated | Added `.env.local` and `.env.*.local` patterns alongside existing `.env` exclusion |
| `.env.example` | Updated | Added `AI_API_KEY`, `AI_PROVIDER`, `GA4_API_SECRET` entries as documented templates |
| `config.js` | Created | Centralizes all `process.env` reads in one module; all future code imports secrets from here, never directly from `process.env` |

**Design Principle — Central Config:**
All environment variable access is funnelled through `config.js`. Individual scripts do not call `process.env` directly. This makes secret rotation, auditing, and environment switching a single-file operation.

**Note on `VITE_` prefix:**
The project uses plain Node.js with `dotenv` — no Vite bundler. `VITE_GA4_MEASUREMENT_ID`-style prefixes have no effect here. Plain `GA4_MEASUREMENT_ID` is used throughout.

---

## Phase 4 — GA4 Analytics Module (Skeleton)

### [2026-04-28] Independent Analytics Module
**Date:** 2026-04-28
**Status:** 🟡 Skeleton complete — wiring blocked pending GA4 approval

**Rationale:**
GA4 integration requires platform-side approval that is currently in progress. Rather than block design work, the analytics module was built in isolation so that the schema and transport logic are production-ready the moment approval lands. Existing business logic (`tracker.js`, `generate-html.js`, etc.) is untouched.

**Changes made:**

| File | Action | Detail |
|------|--------|--------|
| `analytics.js` | Created | Standalone GA4 Measurement Protocol module |

**Architecture — Why Measurement Protocol, not gtag:**
`gtag` is a browser-side JavaScript library. This project runs entirely in Node.js. The GA4 Measurement Protocol is the correct server-side transport: a direct HTTP POST to `https://www.googletagmanager.com/mp/collect`.

**Event Schema — `study_log_submit`:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_id` | string | Client identifier (required by Measurement Protocol) |
| `session_id` | string | GA4 session grouping |
| `input_mode` | string | How the study input was captured |
| `duration_seconds` | number | Length of the study session |
| `requirement_type` | string | Type of learning requirement met |
| `video_id` | string | YouTube video ID |
| `channel_id` | string | YouTube channel ID |
| `channel_name` | string | Human-readable channel name |
| `video_title` | string | Video title at time of logging |
| `category` | string | Channel category (AI / Language Learning / Training / Negotiation) |
| `engagement_time_msec` | number | Derived from `duration_seconds × 1000` |

**Deferred items (explicit holds):**
- **User identifier (UID) definition** — pending: identifier strategy not yet confirmed; UID logic will be added to `analytics.js` after confirmation
- **State management logic** — deferred until UID is confirmed; premature implementation risks data integrity issues
- **Wiring into business logic** — `tracker.js`, `generate-html.js`, and all other existing files remain unmodified; explicit approval required before `sendStudyLog()` is called from anywhere

---

## Current State Summary

**Date:** 2026-04-28

| Area | Status |
|------|--------|
| Core tracker (47 channels, weekly CI) | ✅ Production |
| HTML dashboard (GitHub Pages) | ✅ Production |
| Security infrastructure (config.js, .gitignore) | ✅ Complete |
| GA4 analytics skeleton (analytics.js) | 🟡 Ready — awaiting GA4 approval |
| AI integration skeleton (config.js entries) | 🟡 Defined — logic not yet implemented |
| UID / state management | 🔴 Deferred — awaiting identifier confirmation |
| Business logic wiring (Code Freeze) | 🔴 Frozen — explicit approval required |

---

*Updated: 2026-04-28*

## Phase 5 ? Sandbox Initialization

**Date:** 2026-04-28
**Status:** ? Complete

**Summary:**
Phase 2 - Sandbox initialized in /v2-test based on Antigravity Audit.

Phase 2 - Step 2: Data plumbing for library page completed

Phase 2 - Step 3: English Brain Sync-Stage logic initialized

Phase 2 - Step 4: Analysis log dry run and schema validation completed

Phase 3 Started: Status page infrastructure initialized

Phase 3 - Step 2: Visual dashboard and Sync-Gauge implemented

Phase 3 - Step 3: Stage-based content tiering and AI insight UI implemented

Phase 4 - Step 1: Proactive agent prompting and business translation logic initialized

Phase 4 - Step 2: Insight Vault and data persistence with localStorage implemented

Phase 4 - Step 3: Toolkit export and negotiation simulator implemented

Phase 5 Started: v2-test merged to production root

Phase 5 - Step 2: Mobile optimization and professional branding completed

### Final System Architecture Summary
* **6단계 성숙도 모델 (6-Stage Maturity Model)**: 단순한 시간/점수 기반의 레벨업이 아닌, 영어 뇌의 성숙 과정을 6단계(Ignition → Contact → Drilling → Encoding → Deployment → Integration)로 세분화하여, 사용자 성숙도에 맞는 비즈니스 팁과 영상 가중치를 제공하는 지능형 시스템.
* **localStorage 기반 자산화 (Data Persistence & Vault)**: 사용자가 학습 중 남긴 AI 인사이트나 스스로 깨달은 점을 'My Insight Vault'에 보관하고 브라우저 localStorage를 활용해 영구 저장. 이를 마크다운 포맷의 비즈니스 리포트로 내보낼 수 있도록 하여, 소비형 학습을 '자산화'로 전환.
* **에이전트 능동 질문 (Proactive Agent Prompting & Sim)**: 사용자가 질문하기 전에 현재 학습 단계와 콘텐츠 문맥을 분석하여 먼저 질문을 던지거나, '가격 협상' 같은 특정 비즈니스 상황을 모사하여(Simulation mode) 사용자의 댓글을 '표준(Standards)' 관점에서 실시간 분석해주는 능동적 코칭 환경 구축.
