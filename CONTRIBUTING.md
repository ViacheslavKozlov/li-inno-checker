# Contributing

This project versions itself **automatically** from commit messages. You never edit the
version or the changelog by hand — you write good commits, and the tooling does the rest.
This document is the canonical description of that flow.

## TL;DR

1. Branch off `dev`, make your change.
2. Commit using **[Conventional Commits](https://www.conventionalcommits.org/)** (a local
   Husky hook enforces the format).
3. Open a PR **into `dev`**. CI lints commits, types, tests, and builds. No deploy.
4. When `dev` has accumulated enough to ship, open a PR **`dev` → `main`** and merge it.
5. [release-please](https://github.com/googleapis/release-please) opens (or updates) a
   **release PR** on `main` proposing the next version + changelog entries.
6. Merge the release PR to cut the release: it bumps `package.json`, updates `CHANGELOG.md`,
   tags (`vX.Y.Z`), and **publishes a GitHub Release** — which triggers the production
   deploy to Railway.

## Branching & promotion

| Branch     | Role                         | Rules                                                                                                                    |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| feature/\* | Your work                    | Branch off `dev`; PR back into `dev`.                                                                                    |
| `dev`      | Integration (default branch) | Changes accumulate here; CI runs, nothing deploys.                                                                       |
| `main`     | Production / releases        | **Protected** — no direct pushes; updated only by a `dev` → `main` PR. release-please + the production deploy live here. |

Promotion is one-directional: **feature → `dev` → `main`**. Nothing deploys to production
until a release is published from `main`, so `dev` is a safe place to batch changes.

> **Protection:** `main` has a branch-protection rule requiring a pull request before merging
> (so it can't be pushed to directly). Status checks are intentionally **not** marked
> "required" on `main`, because the release PR is opened by `GITHUB_TOKEN` and so doesn't
> run CI — making checks required would deadlock it. Code is still gated: the `dev` → `main`
> PR runs full CI. If you want required checks on `main` anyway, give release-please a PAT
> (`RELEASE_PLEASE_TOKEN`) so its PR triggers CI.

## Commit message format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

Examples:

```
feat(bot): add /version command
fix(checker): treat /checkpoint redirect as UNAVAILABLE
refactor: externalize hardcoded operational values to validated env
feat!: drop Node 24 support
```

### Type → version bump

The commit `type` decides how the version moves (Semantic Versioning):

| Type                                    | Changelog section | Version bump            |
| --------------------------------------- | ----------------- | ----------------------- |
| `feat`                                  | Features          | **minor** (x.**Y**.0)   |
| `fix`                                   | Bug Fixes         | **patch** (x.y.**Z**)   |
| `perf`                                  | Performance       | patch                   |
| `refactor`                              | Refactors         | patch                   |
| `docs`                                  | Documentation     | patch                   |
| `revert`                                | Reverts           | patch                   |
| `chore`, `test`, `ci`, `build`, `style` | _(hidden)_        | no release on their own |

A **breaking change** — a `!` after the type/scope (`feat!:`) or a `BREAKING CHANGE:` footer —
forces a **major** bump (**X**.0.0), regardless of type.

> Changelog sections and visibility are configured in
> [`release-please-config.json`](./release-please-config.json).

## How releases work (release-please)

- `.github/workflows/release-please.yml` runs on every push to `main`.
- It reads the Conventional Commits since the last release and maintains a single
  **"release PR"** titled like `chore(main): release X.Y.Z`. As more commits land on `main`,
  this PR updates itself with the accumulated changes.
- **Merging the release PR is the act of releasing.** On merge, release-please:
  - bumps `version` in `package.json` (and `.release-please-manifest.json`),
  - writes the new section into `CHANGELOG.md`,
  - creates the `vX.Y.Z` git tag and **publishes a GitHub Release**.
- Publishing that release triggers [`deploy.yml`](./.github/workflows/deploy.yml), which
  deploys the release's tag to Railway. **Merging `dev` → `main` does not deploy on its own** —
  only a published release does. This keeps "code on `main`" separate from "shipped to prod".

The release PR is opened by `GITHUB_TOKEN`, so it does not itself re-trigger the
`pull_request` CI — that's expected; the changes were already validated on their `dev` PRs.

> One-time repo setting: **Settings → Actions → General → Workflow permissions** must have
> "Read and write permissions" **and** "Allow GitHub Actions to create and approve pull
> requests" enabled, or release-please can't open the release PR.

## Deploy & rollback

- **Deploy** is [`deploy.yml`](./.github/workflows/deploy.yml). It runs when a GitHub Release
  is **published** (the normal path) and deploys that release's tag via `railway up`.
- **Rollback by version** uses the same workflow's manual trigger — no cherry-picking:
  1. **Actions → Deploy → Run workflow**.
  2. Set **`ref`** to the version tag you want live, e.g. `v1.2.0`.
  3. Run it. The workflow checks out that tag and rebuilds/redeploys that exact version
     (the Dockerfile builder rebuilds from the checked-out source).
- To find a tag to roll back to, see the [Releases page](../../releases) or `git tag --list`.
  Railway's own deployment history (dashboard / `railway` CLI) is a secondary fallback.

## Local enforcement

- `npm install` sets up a Husky `commit-msg` hook (via the `prepare` script) that runs
  **commitlint** against every commit message. A non-conforming message is rejected before
  it's created.
- Config: [`commitlint.config.mjs`](./commitlint.config.mjs)
  (extends `@commitlint/config-conventional`).
- CI re-checks commit messages on PRs (`commitlint` job in `ci.yml`) as a backstop.

## Where the version shows up

The running app reads its version from `package.json` at startup
([`src/config/version.ts`](./src/config/version.ts)):

- it's logged on boot (`Starting li-inno-checker {version: ...}`), and
- the bot answers `/version` with it.

So whatever release-please stamped into `package.json` is exactly what a deployed build
reports — no manual constant to keep in sync.
