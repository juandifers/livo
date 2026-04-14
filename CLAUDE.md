# Livo — Shared Asset Booking System

Monorepo for a fractional ownership booking app. Three separate deployments: Node.js API, Next.js admin panel, React Native mobile app.

---

## Project Structure

```
livo/
├── apps/
│   ├── backend/         # @livo/backend — Node.js/Express REST API (Vercel)
│   ├── admin/           # @livo/admin — Next.js admin panel (Vercel)
│   └── mobile/          # @livo/mobile — React Native / Expo (EAS)
├── packages/
│   └── contracts/       # @livo/contracts — shared constants, fixtures, types
├── docs/rules/          # CANONICAL booking business rules — ground truth
├── .github/workflows/   # CI: pr-checks.yml + deploy.yml
├── .nvmrc               # Node 20 pin
└── package.json         # Monorepo root (npm workspaces)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, Mongoose, MongoDB Atlas |
| Admin | Next.js 16 (Turbopack), TypeScript, Tailwind CSS |
| Mobile | React Native, Expo SDK 54, Expo Router, EAS |
| Shared | @livo/contracts (booking constants, date fixtures) |
| Auth | JWT (httpOnly cookies) |
| Storage | Cloudinary (images) |
| Email | Nodemailer (Gmail SMTP) |
| CI/CD | GitHub Actions → Vercel (BE+Admin), EAS Update (Mobile) |

---

## Commands

```bash
# Start all services locally (BE:3000, Admin:3001, Expo)
npm run dev

# Kill ports if needed
npm run kill-ports

# Install all dependencies
npm ci

# Run full booking quality gate (must pass before deploy)
npm run test:booking:gate

# Individual test suites
npm run test:be:rules          # Backend booking rule enforcement
npm run test:fe:booking        # Mobile booking tests
npm run test:admin:booking     # Admin booking tests
npm run test:date:contract     # Cross-platform date edge cases (5 timezones)
npm run test:rules:traceability # Verify rule tags match docs/rules/
```

---

## Business Rules — CRITICAL

**Always consult `docs/rules/rulesHOMES.md` and `docs/rules/rulesBOATS.md` before touching any booking logic.**

These are the canonical ground truth. The enforcement lives in `apps/backend/src/controllers/bookingController.js`. Rule violations are tagged with IDs like `RULE-HOME-001`.

Numeric constants (min stay, max stay, allowance per share, etc.) live in `packages/contracts/src/booking-constants.js` and are imported by all three apps.

Key rules summary:
- **Annual allowance**: 44 days per 1/8 share (rolling 12-month window)
- **Min stay**: 2 days (homes), 1 day (boats)
- **Max horizon**: 2 years
- **Lead-time buckets**: >60 days (strict caps) / 8-60 days (flexible) / ≤7 days (extra allowance)
- **Special dates**: Admin-defined Type 1/2 ranges; max 1 concurrent per 1/8 when >60 days out

---

## Architecture

```
Mobile App (Expo) ──────────┐
Admin Panel (Next.js) ──────┼──→ REST API (Express) ──→ MongoDB Atlas
                            │         ↕
                        Cloudinary  Nodemailer
```

- **Admin proxy**: `apps/admin/src/app/api/[...path]/route.ts` proxies all `/api/*` calls to backend
- **Auth guard**: `apps/admin/middleware.ts` checks `token` cookie, redirects to `/login`
- **CORS**: Production requires explicit `CORS_ALLOWED_ORIGINS` env var (comma-separated)
- **Rate limiting**: Auth endpoints: 5 req/hr; General: 100 req/15min

---

## CI/CD

Two workflows in `.github/workflows/`:

### pr-checks.yml
Runs on PRs to `main`/`develop` and pushes to those branches.
- **Typecheck** — `tsc --noEmit` for admin
- **Lint** — `next lint` (admin), `expo lint` (mobile)
- **Booking quality gate** — rule traceability, backend booking rules, date contract across 5 timezones, mobile + admin booking tests. Requires MongoDB service container.

### deploy.yml
Runs on push to `main` only. Waits for pr-checks to pass first.
- **deploy-backend** — Vercel production deploy (`apps/backend`)
- **deploy-admin** — Vercel production deploy (`apps/admin`)
- **eas-update** — OTA update to Expo production channel

Required GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_BE_PROJECT_ID`, `VERCEL_ADMIN_PROJECT_ID`, `EXPO_TOKEN`.

---

## Environment Variables

### Backend (`apps/backend/.env`)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-random-secret>
CORS_ALLOWED_ORIGINS=https://livoadmin.vercel.app,https://api.expo.dev
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...  # Gmail App Password
FROM_EMAIL=...
FROM_NAME=Livo
BASE_URL=https://livo-backend-api.vercel.app
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
TRUST_PROXY=1
```

### Admin (`apps/admin/.env.local`)
```
NEXT_PUBLIC_API_BASE_URL=https://livo-backend-api.vercel.app/api
NEXT_PUBLIC_API_URL=https://livo-backend-api.vercel.app
```

### Mobile — set via EAS Secrets or `app.json`
```
EXPO_PUBLIC_API_URL=https://livo-backend-api.vercel.app/api
```

---

## Deployment

### Automated (preferred)
1. Open PR to `main` — pr-checks.yml runs typecheck, lint, booking gate
2. Merge to `main` — deploy.yml deploys backend + admin to Vercel, publishes OTA to Expo

### Manual
```bash
# Backend + Admin (Vercel)
cd apps/backend && vercel --prod
cd apps/admin && vercel --prod

# Mobile (EAS OTA)
cd apps/mobile && eas update --channel production --platform all

# Mobile (native build — only when native deps change)
cd apps/mobile && eas build --platform all --profile production
eas submit --platform all --profile production
```

### Vercel Projects
- Backend: `livo-backend-api` — root directory `apps/backend`
- Admin: auto-detected Next.js — root directory `apps/admin`

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/backend/src/controllers/bookingController.js` | Core booking rule enforcement |
| `apps/backend/src/config/config.js` | All env var definitions with defaults |
| `apps/backend/src/config/db.js` | MongoDB connection |
| `apps/admin/middleware.ts` | Auth guard for admin routes |
| `apps/admin/src/app/api/[...path]/route.ts` | API proxy to backend |
| `apps/mobile/app.json` | Expo config (bundle IDs, project ID) |
| `apps/mobile/eas.json` | EAS build profiles |
| `packages/contracts/src/booking-constants.js` | Shared numeric constants |
| `packages/contracts/src/index.d.ts` | TypeScript declarations for contracts |
| `docs/rules/rulesHOMES.md` | Canonical homes booking rules |
| `docs/rules/rulesBOATS.md` | Canonical boats booking rules |
| `.github/workflows/pr-checks.yml` | PR gate (typecheck, lint, booking tests) |
| `.github/workflows/deploy.yml` | Production deploy on merge to main |

---

## Testing Strategy

Tests must pass before any deployment. The quality gate runs:
1. **Rule traceability** — every rule in docs has a matching test tag
2. **Backend booking rules** — Jest integration tests against real MongoDB
3. **Date contract** — edge cases across 5 timezones (UTC, Bogota, LA, Madrid, Auckland)
4. **Mobile + Admin integration tests**

To test the admin UI locally, use the `agent-browser` skill:
```bash
# Start services first
npm run dev
# Then use agent-browser to interact with http://localhost:3001
```

---

## Security Checklist

- `.env` files are gitignored — never commit secrets
- Use Vercel environment variables for production secrets
- Use EAS Secrets for mobile build secrets
- JWT_SECRET must be a strong random string in production
- CORS_ALLOWED_ORIGINS must be explicit in production (not wildcard)
- MongoDB Atlas: whitelist Vercel's IP ranges (or use 0.0.0.0/0 with strong auth)
- Gmail SMTP: use App Password, not account password

---

## On-Demand Context

| Topic | File |
|-------|------|
| Homes booking rules | `docs/rules/rulesHOMES.md` |
| Boats booking rules | `docs/rules/rulesBOATS.md` |
| Shared contracts package | `packages/contracts/README.md` |

---

## Notes

- This is a **fractional ownership** system — each user owns 1/8 shares; rules are per-share
- The app is feature-complete; focus is on **UX polish, bug fixes, and production readiness**
- When fixing bugs, always verify against the rule ID tags in `bookingController.js`
- Run `npm run test:booking:gate` after any booking-related change — CI will block deploy if it fails
- Mobile app bundle ID: `com.livo.app` (both iOS and Android), Expo project: `juandifers/livo`
- Node version pinned to 20 via `.nvmrc` — all CI jobs use `node-version-file: '.nvmrc'`
