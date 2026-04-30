# youtube-tracker / Lumina Study

YouTube competitor intelligence platform + interactive English learning web app.
Tracks 47 channels across 4 categories (AI, Language, Training, Negotiation),
fetches weekly via YouTube Data API, deploys to GitHub Pages automatically.

## Data strategy — intentional, do not change
- `results.json` and `video-details.json` are **intentionally tracked in Git**
  as a backup/rollback snapshot for the CI/CD pipeline. Never suggest removing them.
- `channel_ids.json` caches YouTube channel IDs to preserve API quota. Do not delete.
- Weekly CI auto-restores from Git if a fresh fetch fails the 80% integrity check.

## Inactive / skeleton code — do not activate without explicit approval
- `analytics.js` is an incomplete stub. It is not broken. Do not touch it.
- AI integration (`ai.apiKey`, `ai.provider` in `config.js`) is configured but
  intentionally not wired. Do not activate or connect it.
- GA4 Measurement Protocol events are planned but awaiting platform approval.

## Code discipline
- **Business logic changes require explicit user approval before implementation.**
  Always propose first, wait for confirmation, then execute.
- No test framework exists. Do not introduce one without being asked.
- `generate-html.js` is a large monolith by design for now — do not refactor
  it without discussion.

## Core UX concept — do not simplify away
- The **6-stage maturity model** ("English Brain Sync-Stage":
  Ignition → Contact → Drilling → Encoding → Deployment → Integration)
  is a central design pillar, not incidental complexity. Preserve it.
- The **Insight Vault** (localStorage-based insight capture + Markdown export)
  is a key feature, not a nice-to-have.

## Deployment
- Hosted on **GitHub Pages**, deployed automatically every Monday 09:00 UTC
  via `.github/workflows/update.yml`.
- The `_site/` folder is the build artifact; it is NOT tracked in Git.
- `report.html` (generated, 984KB) is excluded from Git intentionally.

## Key file map
| File | Role |
|------|------|
| `tracker.js` | YouTube API fetch — core data pipeline |
| `generate-html.js` | Builds the deployed dashboard from results.json |
| `config.js` | All env vars live here — never use process.env directly elsewhere |
| `js/state.js` | Browser state manager (localStorage, maturity stage, filters) |
| `dev-log.md` | Full architectural decision history — read this for background context |
