# AGENTS.md

Guidance for AI agents working on this repository.

## Project overview

Resume Tailor is a local-first React 18 + Vite app for building targeted resume/application packets from a reusable resume profile.

The app stores profile data, history, and API key settings in browser localStorage. There is no backend service in this repo.

## Tech stack

- React 18
- Vite
- Tailwind CSS
- Vitest
- lucide-react icons

## Common commands

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Run `npm run lint`, `npm test`, and `npm run build` before considering UI or logic changes done. Linting uses a flat ESLint config (`eslint.config.js`); CI runs lint + test + build on push/PR (`.github/workflows/ci.yml`).

## Repo conventions

- Keep the app local-first. Do not add a backend, auth system, database, or telemetry unless explicitly requested.
- Do not commit secrets, API keys, generated build output, or dependency folders.
- Browser-stored API keys must remain user-controlled and clearly disclosed in the UI.
- Preserve the existing recommendation/tailoring logic unless the task explicitly asks to change it.
- Preserve `src/lib/workday.stable.js` as a backup/reference Workday script unless explicitly asked to remove it.
- Prefer focused UI improvements over broad redesigns.
- Public/customer-facing copy should feel polished, clear, and product-quality.

## Important paths

- `src/App.jsx` — app shell and routing state
- `src/pages/Generator.jsx` — Tailor workflow page
- `src/pages/MyExperience.jsx` — resume source-of-truth/profile page
- `src/pages/History.jsx` — saved versions page
- `src/pages/Settings.jsx` — API key/defaults/privacy page
- `src/components/` — shared UI components
- `src/lib/pricing.js` — provider/model pricing estimates
- `src/lib/workday.js` — active Workday helper script generator
- `src/lib/workday.stable.js` — backup/reference Workday script

## Quality bar

- Check for console/runtime errors when changing interactive UI.
- Keep disabled states readable and accessible.
- Avoid label/copy regressions such as stale page names.
- Keep exports/download actions obvious and easy to reach.
