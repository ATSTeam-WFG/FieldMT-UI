# FieldMT

The field management tool for a title rep’s book of business. Reps log relationship-building activity and work their follow-ups; managers get real-time visibility into team performance.

![CI](https://github.com/anishtatke/FieldMT/actions/workflows/frontend-ci.yml/badge.svg)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 |
| UI Primitives | shadcn/ui + Radix UI |
| Data fetching | TanStack Query v5 (React Query) |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Testing | Playwright |

---

## Project Structure

```
app/                    # Next.js App Router pages
├── dashboard/          # Agent KPI dashboard
├── manager/            # Manager team dashboard
├── contacts/           # Contact list + [id] detail
├── activities/         # Activity log
├── contracts/          # Contract pipeline
├── follow-ups/         # Follow-up queue
├── performance/        # Agent & team analytics
├── scores/             # Relationship score cards
├── settings/           # User settings
├── team/               # Team roster (manager view)
├── agent/[id]/         # Agent detail (manager view)
├── login/              # Sign-in
├── signup/             # Account creation (agent & manager flows)
└── onboarding/         # User-type questionnaire

components/
├── ui/                 # shadcn/ui primitives
└── fieldmt/            # FieldMT-specific components

lib/
├── api/                # Typed API client + per-domain fetch functions
├── hooks/              # React Query data hooks (useContacts, useActivities, …)
├── context/            # React Context providers (role, theme, panels)
└── utils.ts            # Shared utilities

tests/                  # Playwright E2E test suite (18 spec files)
```

---

## Prerequisites

- Node.js 20+
- The [FieldMT API](https://github.com/ATSTeam-WFG/FieldMT-API) running at `http://localhost:8000`

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/ATSTeam-WFG/FieldMT-UI.git
cd FieldMT
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The app requires the [FieldMT API](https://github.com/ATSTeam-WFG/FieldMT-API) to be running for data to load. See that repo's README for setup instructions.

---

## Demo Mode

The app ships with a built-in demo experience for investor and sales presentations:

- **Auto-login** — no credentials required; navigating to `/` loads the dashboard immediately
- **Role switcher** — toggle between Agent (Sarah Chen) and Manager (Jane Doe) at any time
- **All form submissions succeed** — log activity, add contact, add contract — all show a success toast without hitting the backend
- **Demo credentials** — if prompted: `demo@example.com` / `demo1234`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Playwright E2E tests (requires both servers running) |
| `npm run test:ui` | Playwright with interactive UI mode |
| `npm run test:headed` | Playwright in headed browser mode |

---

## Role System

| Role | Persona | Key screens |
|------|---------|-------------|
| Agent | Sarah Chen, Senior Title Agent | Dashboard, Activities, Contacts, Follow-ups, Contracts, Performance, Scores |
| Manager | Jane Doe, Regional Sales Manager | Manager Dashboard, Team Roster, Agent Detail |

Role switching is available via the dropdown in the top navigation.

---

## E2E Testing

Tests run against a live Next.js dev server and FieldMT API.

### Setup

1. Start the backend API (`http://localhost:8000`)
2. Set auth credentials for the test session:

```bash
export TEST_EMAIL=your-test-user@example.com
export TEST_PASSWORD=yourpassword
```

3. Run tests:

```bash
npm test
```

### What's covered (18 spec files)

| Spec file | What it tests |
|-----------|--------------|
| `login.spec.ts` | Login page fields, password toggle |
| `auth-flow.spec.ts` | Unauthenticated redirect, error handling |
| `signup.spec.ts` | Individual + manager signup flows, token storage |
| `onboarding.spec.ts` | User-type questionnaire routing |
| `dashboard.spec.ts` | Agent KPI cards, layout |
| `manager.spec.ts` | Manager dashboard, period selector |
| `activities.spec.ts` | Activity list, filtering, search |
| `log-activity-flow.spec.ts` | Full log-activity panel workflow |
| `contacts.spec.ts` | Contact list, search |
| `contact-flow.spec.ts` | Add contact panel workflow |
| `contracts.spec.ts` | Contract list |
| `contract-flow.spec.ts` | Add contract panel workflow |
| `follow-ups.spec.ts` | Follow-up list |
| `follow-up-flow.spec.ts` | Mark follow-up complete |
| `performance.spec.ts` | Agent & manager performance views, charts |
| `scores.spec.ts` | Score cards |
| `team.spec.ts` | Team roster, invite panel, agent navigation |
| `log-activity.spec.ts` | Activity logging page |

### Auth state

`global-setup.ts` runs before the suite. If `TEST_EMAIL` and `TEST_PASSWORD` are set, it logs in and saves the token to `tests/.auth/user.json` (gitignored). All specs that use `storageState: 'tests/.auth/user.json'` share this session — login runs once, not per test.

If credentials are not set, `global-setup` writes empty state and prints a warning. Tests that need a logged-in user will redirect to `/login`.

---

## CI/CD

Two GitHub Actions workflows run on every push and pull request.

### `frontend-ci.yml` — required, runs on every push
- ESLint (`npm run lint`)
- TypeScript type check (`tsc --noEmit`)
- Production build (`npm run build`)

### `e2e.yml` — optional, runs on `main` push + manual trigger
- Spins up PostgreSQL + backend + frontend
- Runs full Playwright suite
- Requires Supabase secrets and `BACKEND_REPO_TOKEN` configured in GitHub repo secrets
- See [CI/CD setup guide](https://github.com/anishtatke/FieldMT/blob/main/.github/workflows/e2e.yml) for required secrets

---

## Design System

Design tokens are defined in `globals.css` and `tailwind.config.ts`. Key rules:

| Token | Usage |
|-------|-------|
| `--gold` (`#c4a574`) | KPI values, card top borders, active states, score rings |
| `--background` | Page background (dark: `#0f0f0f`, light: `#fafaf9`) |
| `--card` | Card surface (dark: `#171717`, light: `#ffffff`) |

**Never use gold as a large background fill.** Cards have a 2px gold border on the top edge only — the other three sides use `var(--border)`.

Dark mode is the default. Light mode toggled via the theme button in the nav.

---

## Contributing

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Run `npm install`
3. Make your changes
4. Run `npm run lint && npx tsc --noEmit` — both must pass
5. Run `npm run build` — must succeed
6. Open a pull request — CI must pass before merge

### Key patterns

- **Data fetching** — use `lib/hooks/` hooks backed by React Query; never fetch directly in components
- **New pages** — add the route under `app/`, export a default React Server Component or `"use client"` component as needed
- **New API endpoints** — add a typed function to `lib/api/` and a corresponding hook in `lib/hooks/`
- **Styling** — Tailwind utility classes only; no inline styles; use design tokens for colors

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL (e.g. `http://localhost:8000`) |
| `TEST_EMAIL` | E2E only | Email of a test user for Playwright global setup |
| `TEST_PASSWORD` | E2E only | Password for that test user |
