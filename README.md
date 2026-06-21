# li-inno-checker

A lightweight Telegram bot that checks whether **LinkedIn profiles are available** and keeps dated screenshot proof of every check.

You register named LinkedIn profile URLs with the bot; it visits each one anonymously with a headless browser, decides whether it **opens** (available) or is gated/removed (unavailable), and stores a compact screenshot in MongoDB GridFS as dated proof. You can check on demand from Telegram, and a weekly background job re-checks everything automatically.

## Features

- Track multiple named LinkedIn profiles per Telegram user (data isolated per user).
- Check **all** profiles or **one** on demand, straight from Telegram.
- Weekly automatic re-check (in-process cron, configurable schedule).
- Every check stores a screenshot in MongoDB GridFS with the **capture date watermarked** into the image.
- Browse a profile's **history** and pull back the stored screenshot for any past check.
- Status detection: ✅ Available · ❌ Unavailable · ⚠️ Error (with an audit reason stored per check).
- Removing a profile cascades — it also deletes its stored screenshots and history.
- Storage stays bounded: checks + screenshots older than `CHECK_RETENTION_DAYS` are pruned automatically.
- On-demand checks are rate-limited per user and capped process-wide to protect memory.
- Optional allowlist to restrict bot access to specific Telegram user IDs.

## Stack

Node.js · TypeScript · [Telegraf](https://telegraf.js.org) · [Playwright](https://playwright.dev) (Chromium) · [sharp](https://sharp.pixelplumbing.com) · MongoDB (Mongoose + GridFS) · node-cron · pino · zod

---

## Local setup

### Prerequisites

| Requirement            | Notes                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Node.js 26+**        | Check with `node -v` (enforced via `engines` in `package.json`)                                            |
| **MongoDB**            | [Atlas free tier](https://www.mongodb.com/cloud/atlas) works fine; any `mongodb://` or `mongodb+srv://` URI |
| **Telegram bot token** | Create one via [@BotFather](https://t.me/BotFather) → `/newbot`                                             |

### 1. Install dependencies

```bash
npm install
npx playwright install chromium   # one-time: downloads the Chromium browser binary
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the two **required** values:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
TELEGRAM_BOT_TOKEN=123456789:AAF...your-token-here
```

Everything else has sensible defaults and can be left as-is for local development.

### 3. Run

```bash
npm run dev                  # bot + weekly cron, hot-reload (tsx watch)
npm run build && npm start   # compile to dist/ then run (production)
npm run check                # one-shot check pass over all profiles (useful from system cron)
```

---

## How the bot works

### Flow overview

```
User sends command or taps menu button
  → Telegraf command handler
    → checkService.checkProfile()
      → LinkedInChecker (Playwright, headless Chromium, fresh incognito context)
        → captures the viewport, downscales + watermarks it (sharp → WebP)
        → classifyLinkedInPage() determines status
      → screenshot saved to MongoDB GridFS (bucket "screenshots")
      → Check record created, Profile last-check snapshot updated
      → NotificationService sends photo + caption back to user
```

### Status detection

LinkedIn shows a sign-in modal on **every** page when visited anonymously — available and unavailable profiles both show it, so the modal is not a signal. Status is determined by a pure, unit-tested classifier (`src/services/linkedin-classifier.ts`):

- HTTP 404, or a redirect whose final URL contains `/authwall`, `/login`, `/checkpoint`, or `/uas/login` → **UNAVAILABLE**
- Page text matching a known "wall" phrase (e.g. _"may be private"_, _"may not exist"_, _"page not found"_, _"no longer available"_) → **UNAVAILABLE**
- Anything else (the profile rendered) → **AVAILABLE**

The matched signal (e.g. `text:may not exist`) and the page title are stored on every `Check`, so a misclassification is auditable after LinkedIn changes its wording.

### Looking like a real browser

A bare headless request gets bounced to LinkedIn's join page instead of the normal profile view. To get the same page a real Chrome user sees, the checker:

1. Launches with `--disable-blink-features=AutomationControlled`, a `navigator.webdriver` stealth init script, and a current non-headless User-Agent.
2. **Warms up guest cookies** once per run by visiting the LinkedIn homepage, then reuses that `storageState` across all checks.
3. Navigates to each profile with a **Google referrer**.

Removing any of these tends to re-trigger the authwall redirect.

### Screenshots

The checker captures the viewport, then [sharp](https://sharp.pixelplumbing.com) downscales it to `SCREENSHOT_WIDTH` (default 1024px) and encodes **WebP** at `SCREENSHOT_QUALITY` — roughly half the bytes of the old JPEG at the same readability, to keep GridFS storage low. When `SCREENSHOT_WATERMARK` is on (default), the capture date is baked into the bottom-right corner in that same pass, so it carries through to delivery and history. Telegram only renders JPEG reliably as an inline photo, so stored WebP is transcoded back to JPEG (`DELIVERY_JPEG_QUALITY`) on the way out.

### Weekly cron

`node-cron` runs `runCheckPass()` on the schedule defined by `CRON_SCHEDULE` (default: Monday 09:00 server time). The same function is called by `npm run check` for manual / external cron use. It opens one shared browser, checks all profiles with bounded concurrency (`CHECK_CONCURRENCY`) and an inter-check delay (`CHECK_DELAY_MS`), and delivers a screenshot per profile to each user's Telegram chat. After each pass it prunes checks + screenshots older than `CHECK_RETENTION_DAYS` so GridFS storage stays bounded.

---

## Using the bot

Send `/start` — a **button menu** appears at the bottom of the chat:

📋 My Profiles · 🔍 Check · ➕ Add · 🗑 Remove · 📜 History · ❓ Help

You never have to remember syntax. Adding is a guided prompt (or paste `Name https://linkedin.com/in/...` directly). Checking and removing use tappable inline buttons; removal asks for confirmation because it cascades to screenshots.

The equivalent slash commands (also shown in Telegram's `/` menu):

| Command             | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `/start`            | Register and show the menu                                         |
| `/add <name> <url>` | Track a LinkedIn profile under a name                              |
| `/list`             | List your profiles with their last status                          |
| `/check`            | Check all profiles, or pick one                                    |
| `/history <name>`   | Show recent checks for a profile and re-send any stored screenshot |
| `/remove <name>`    | Stop tracking a profile (also deletes its screenshots)             |
| `/version`          | Show the running bot version                                       |
| `/help`             | Explain how the bot works                                          |

---

## Versioning & releases

Versions are produced **automatically** from commit messages — nothing is bumped by hand.

**Branching:** work flows **feature → `dev` → `main`**. `dev` (the default branch) is where
changes accumulate; `main` is protected and holds releases. Promote by opening a `dev` → `main`
PR.

- Commits follow **[Conventional Commits](https://www.conventionalcommits.org/)**, enforced
  locally by a Husky `commit-msg` hook (commitlint) and re-checked in CI.
- [release-please](https://github.com/googleapis/release-please) watches `main` and keeps a
  **release PR** with the next [SemVer](https://semver.org/) version and changelog. Merging
  that PR bumps `package.json`, updates [`CHANGELOG.md`](./CHANGELOG.md), tags `vX.Y.Z`, and
  **publishes a GitHub Release**.
- **Deploy on release:** publishing the release triggers the production deploy to Railway —
  merging to `main` alone does not deploy.
- **Rollback by version:** Actions → **Deploy** → Run workflow → set `ref` to a tag (e.g.
  `v1.2.0`) to rebuild and redeploy that exact version. No cherry-picking.
- The deployed build reports its version: it's logged on startup and answered by `/version`.

Full details (branch rules, type → version-bump table, rollback) are in
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Environment variables

Required variables are **bold**. All others have defaults and are optional — the table shows each default.

### Required

| Variable                 | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| **`MONGODB_URI`**        | MongoDB connection string (`mongodb://` or `mongodb+srv://`) |
| **`TELEGRAM_BOT_TOKEN`** | Token from @BotFather                                        |

### Scheduler & checker

| Variable                   | Default     | Description                                                                          |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `CRON_SCHEDULE`            | `0 9 * * 1` | When the weekly check runs (cron expression, server local time)                      |
| `BROWSER_HEADLESS`         | `true`      | Run Chromium headless                                                                |
| `BROWSER_NO_SANDBOX`       | `false`     | Add `--no-sandbox`/`--disable-dev-shm-usage`; required as root in a container        |
| `CHECK_TIMEOUT_MS`         | `30000`     | Per-page navigation timeout (ms)                                                     |
| `CHECK_CONCURRENCY`        | `2`         | Profiles checked in parallel within a single pass                                    |
| `CHECK_DELAY_MS`           | `3000`      | Delay between checks to ease rate-limiting (ms)                                      |
| `MANUAL_CHECK_CONCURRENCY` | `2`         | Process-wide cap on simultaneous on-demand `/check` runs (each opens a browser)      |
| `CHECK_RETENTION_DAYS`     | `365`       | Delete checks + screenshots older than this many days (`0` = keep forever)           |

### Screenshots & delivery

| Variable                      | Default                | Description                                                            |
| ----------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `SCREENSHOT_WIDTH`            | `1024`                 | Width (px) screenshots are downscaled to before encoding              |
| `SCREENSHOT_QUALITY`         | `60`                   | WebP quality 1–100 for stored screenshots; lower = smaller files      |
| `DELIVERY_JPEG_QUALITY`      | `82`                   | JPEG quality when transcoding stored WebP back to a Telegram photo    |
| `SCREENSHOT_WATERMARK`       | `true`                 | Stamp the capture date into each stored screenshot                    |
| `SCREENSHOT_WATERMARK_FORMAT`| `YYYY-MM-DD HH:mm UTC` | Watermark date pattern. Tokens (UTC): `YYYY MM DD HH mm ss`; rest literal |

### Browser fingerprint & timing

| Variable                 | Default                       | Description                                                          |
| ------------------------ | ----------------------------- | -------------------------------------------------------------------- |
| `BROWSER_USER_AGENT`     | _(current desktop Chrome UA)_ | Must **not** contain "HeadlessChrome"; bump as Chrome advances       |
| `BROWSER_VIEWPORT_WIDTH` | `1280`                        | Viewport width captured for each screenshot                          |
| `BROWSER_VIEWPORT_HEIGHT`| `900`                         | Viewport height captured for each screenshot                         |
| `BROWSER_LOCALE`         | `en-US`                       | Locale forced on every context (also drives Accept-Language)         |
| `BROWSER_WARMUP_WAIT_MS` | `1500`                        | Homepage dwell while guest cookies warm up (ms)                      |
| `CHECK_SETTLE_MS`        | `2500`                        | Settle time after navigation before capture + classify (ms)          |
| `CHECK_PROFILE_REFERER`  | `https://www.google.com/`     | Referer sent with profile visits (the normal "from Google" path)     |
| `LINKEDIN_HOME_URL`      | `https://www.linkedin.com/`   | Homepage visited once per run to collect guest cookies               |

### App limits, logging & access

| Variable                  | Default   | Description                                                 |
| ------------------------- | --------- | ----------------------------------------------------------- |
| `HISTORY_LIMIT`           | `10`      | How many recent checks a `/history` view lists              |
| `MAX_PROFILES_PER_USER`   | `50`      | Max profiles a single user can track                        |
| `MAX_PROFILE_NAME_LENGTH` | `60`      | Max length of a profile name                                |
| `LOG_LEVEL`               | `info`    | pino log level: `trace` `debug` `info` `warn` `error`       |
| `ALLOWED_TELEGRAM_IDS`    | _(empty)_ | Comma-separated Telegram user IDs; empty = open to everyone |
| `TELEGRAM_CHAT_ID`        | —         | Legacy single-chat id; unused in multi-user mode            |

The app **validates all variables with zod at startup** and exits immediately with a clear error message on bad config — you won't get a confusing runtime error later.

---

## Deploying to Railway

The bot ships as a single long-running **worker** (Telegram long-polling + in-process
weekly cron — no inbound HTTP, so no port/domain/healthcheck is needed). It runs on
[Railway](https://railway.com) from the included `Dockerfile`, which is based on the
official Playwright image so the Chromium build and its OS dependencies are baked in.

Files involved:

- **`Dockerfile`** — multi-stage build on `mcr.microsoft.com/playwright:v1.61.0-noble` (keep the tag in sync with the `playwright` version in `package.json`).
- **`railway.json`** — tells Railway to build with the Dockerfile and restart on failure.
- **`.github/workflows/ci.yml`** — runs lint/typecheck/test/build (and commitlint) on every push & PR (no deploy).
- **`.github/workflows/release-please.yml`** — maintains the release PR on `main` and publishes a GitHub Release on merge.
- **`.github/workflows/deploy.yml`** — deploys to Railway when a release is **published**, and manually (by tag) for rollback.

### One-time setup

1. **Create the service** in the Railway project (`li-inno-checker`): in the dashboard
   choose **New → Empty Service** (name it `li-inno-checker`). Or, from a local clone:
   `npm i -g @railway/cli && railway login && railway link` (select the project) `&& railway up`.

2. **Set environment variables** on the service (Railway dashboard → service → _Variables_).
   Required: `MONGODB_URI`, `TELEGRAM_BOT_TOKEN`. Optional tuning lives in the tables above —
   `BROWSER_NO_SANDBOX` is already forced on by the Docker image. Set `TZ` (e.g.
   `TZ=Europe/Kyiv`) if you want `CRON_SCHEDULE` to fire in your local time rather than UTC.

3. **Wire up GitHub Actions deploys:**
   - Create a **project token**: Railway dashboard → project → _Settings → Tokens_ → create one
     scoped to the environment you deploy to (e.g. `production`).
   - In GitHub → repo _Settings → Secrets and variables → Actions_, add a secret
     **`RAILWAY_TOKEN`** with that value. If your service is named something other than
     `li-inno-checker`, also add a repository **variable** `RAILWAY_SERVICE` with the real name.

After that, deploys happen when a **GitHub Release is published** (see
[Versioning & releases](#versioning--releases)) — i.e. when you merge the release PR on
`main`. To **roll back**, run the **Deploy** workflow from the Actions tab with `ref` set to a
previous tag (e.g. `v1.2.0`).

> Prefer no GitHub Actions? You can instead connect the GitHub repo directly in the Railway
> dashboard (service → _Settings → Source_) and Railway will build the Dockerfile and redeploy
> on every push on its own — in that case the `deploy` job is redundant and can be removed.

---

## Testing

```bash
npm test              # unit tests (Vitest)
npm run test:watch    # watch mode
npm run typecheck     # type-only check (no emit)
npm run lint          # ESLint
npm run format        # Prettier
```

Tests live next to source as `*.test.ts`. The pure classifier (`linkedin-classifier.ts`) and URL utilities are the main unit-tested seams — extend those rather than testing Playwright directly.

---

## Notes

- Profiles are visited **anonymously**; automated access can be rate-limited by LinkedIn. The concurrency and delay settings exist to keep checks gentle.
- Multi-user: data is isolated by Telegram user ID. A middleware upserts the `User` record (with `chatId`) on every interaction so the weekly cron knows where to deliver results.
- Delete cascades: removing a profile deletes its `Check` records **and** their GridFS screenshots to reclaim storage.
