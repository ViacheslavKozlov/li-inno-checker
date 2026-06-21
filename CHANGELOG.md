# Changelog

All notable changes to this project are documented in this file.

It is maintained **automatically** by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/). The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/). See [CONTRIBUTING.md](./CONTRIBUTING.md) for how
releases are cut.

> Do not edit released entries by hand — change the commit messages instead. New versions are
> appended above this baseline by the release automation.

## [1.1.1](https://github.com/ViacheslavKozlov/li-inno-checker/compare/v1.1.0...v1.1.1) (2026-06-21)


### Documentation

* correct stale deploy comment in release-please workflow ([a56935d](https://github.com/ViacheslavKozlov/li-inno-checker/commit/a56935d4af486cb9d7a3c8a1db8dfb4238017c0f))
* sync README with current project state ([7af3d2e](https://github.com/ViacheslavKozlov/li-inno-checker/commit/7af3d2e85df1654afacdf2d16b6458fd3bcab2a3))

## [1.1.0](https://github.com/ViacheslavKozlov/li-inno-checker/compare/v1.0.0...v1.1.0) (2026-06-21)


### Features

* add automated versioning, release pipeline, and dev/main deploy flow ([eb9a92f](https://github.com/ViacheslavKozlov/li-inno-checker/commit/eb9a92f0004e6f71fff55efc8c9304d9a7ec9772))
* add automated versioning, release pipeline, and dev/main deploy flow ([f5cabb3](https://github.com/ViacheslavKozlov/li-inno-checker/commit/f5cabb331f75c690d837f155aab1474429af6f13))
* extend check + screenshot retention to 365 days ([770777d](https://github.com/ViacheslavKozlov/li-inno-checker/commit/770777d9de7543cb31b0b2563a439ab6106283d3))
* history retrieval, retention, and check hardening ([d00bf67](https://github.com/ViacheslavKozlov/li-inno-checker/commit/d00bf67175d8bfb4936cb707b1cc64ff43eeeb28))
* stamp capture date watermark onto stored screenshots ([#5](https://github.com/ViacheslavKozlov/li-inno-checker/issues/5)) ([03d88f3](https://github.com/ViacheslavKozlov/li-inno-checker/commit/03d88f30644b75b1a5034557776907ebd3a7618c))
* store screenshots as downscaled WebP to cut GridFS storage ~half ([6bf0928](https://github.com/ViacheslavKozlov/li-inno-checker/commit/6bf09288cc03438b143c4bd375d1300d061eaea2))


### Bug Fixes

* **test:** supply valid env to Vitest so env-dependent imports don't exit CI ([#4](https://github.com/ViacheslavKozlov/li-inno-checker/issues/4)) ([e78d037](https://github.com/ViacheslavKozlov/li-inno-checker/commit/e78d037fc273617f1a182a40041c6696927e9810))


### Refactors

* externalize hardcoded operational values to validated env ([4f60e11](https://github.com/ViacheslavKozlov/li-inno-checker/commit/4f60e1140787de89e20ddb1feee520fb9fc6e314))
* externalize hardcoded operational values to validated env ([8449482](https://github.com/ViacheslavKozlov/li-inno-checker/commit/844948245c965e9549de5c6fa1c535f6ba2ff298))

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
