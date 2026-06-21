import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The running app's SemVer, read once from package.json at startup.
 *
 * release-please owns the version field in package.json, so reading it here keeps
 * the surfaced version in lockstep with each release without a separate constant.
 *
 * Resolved relative to this module (`__dirname`), which lands at the repo root in
 * every layout: `dist/config/version.js` and `src/config/version.ts` (tsx) are
 * both two levels under the root, and the Docker runtime stage copies
 * package.json next to dist. A direct JSON `import` is avoided because the file
 * sits outside `rootDir` and would break `tsc`. Falls back gracefully so a
 * missing/unreadable file never crashes boot.
 */
function readVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8');
    const version = (JSON.parse(raw) as { version?: string }).version;
    if (version) return version;
  } catch {
    // fall through to the env/unknown fallback below
  }
  return process.env.npm_package_version ?? '0.0.0-unknown';
}

export const APP_VERSION = readVersion();
