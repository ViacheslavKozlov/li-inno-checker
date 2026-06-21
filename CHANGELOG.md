# Changelog

All notable changes to this project are documented in this file.

It is maintained **automatically** by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/). The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/). See [CONTRIBUTING.md](./CONTRIBUTING.md) for how
releases are cut.

> Do not edit released entries by hand — change the commit messages instead. New versions are
> appended above this baseline by the release automation.

## 1.0.0 (2026-06-21)

Baseline release. Established the LinkedIn-availability Telegram bot:

### Features

- Track named LinkedIn profiles per Telegram user, isolated by `telegramId`.
- On-demand checks (all profiles or one) and a weekly in-process cron re-check.
- Anonymous availability classification (`AVAILABLE` / `UNAVAILABLE` / `ERROR`) with an
  auditable reason stored per check.
- Dated screenshot proof captured per check, watermarked and stored as WebP in MongoDB
  GridFS, delivered to Telegram as JPEG.
- Per-profile history browsing with screenshot retrieval.
- Bounded storage via retention pruning, per-user/process check guarding, and an optional
  Telegram-ID allowlist.
