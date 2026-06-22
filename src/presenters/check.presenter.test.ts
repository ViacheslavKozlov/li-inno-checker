import { describe, it, expect } from 'vitest';
import { CheckStatus } from '../types';
import { emptyTally, formatTally, formatWeeklySummary } from './check.presenter';

describe('emptyTally', () => {
  it('zeroes every status', () => {
    expect(emptyTally()).toEqual({
      [CheckStatus.AVAILABLE]: 0,
      [CheckStatus.UNAVAILABLE]: 0,
      [CheckStatus.ERROR]: 0,
    });
  });

  it('returns a fresh object each call (no shared mutable state)', () => {
    const a = emptyTally();
    a[CheckStatus.AVAILABLE] += 1;
    expect(emptyTally()[CheckStatus.AVAILABLE]).toBe(0);
  });
});

describe('formatTally', () => {
  it('renders the per-status breakdown', () => {
    const tally = {
      [CheckStatus.AVAILABLE]: 2,
      [CheckStatus.UNAVAILABLE]: 1,
      [CheckStatus.ERROR]: 0,
    };
    expect(formatTally(tally)).toBe('✅ 2 available · ❌ 1 unavailable · ⚠️ 0 error');
  });
});

describe('formatWeeklySummary', () => {
  it('frames the tally with a header and UTC timestamp', () => {
    const tally = {
      [CheckStatus.AVAILABLE]: 3,
      [CheckStatus.UNAVAILABLE]: 0,
      [CheckStatus.ERROR]: 1,
    };
    expect(formatWeeklySummary(4, tally, new Date('2026-06-22T09:00:00.000Z'))).toBe(
      '🗓️ <b>Weekly check complete</b> — 4 profile(s)\n' +
        '✅ 3 available · ❌ 0 unavailable · ⚠️ 1 error\n' +
        '🕓 2026-06-22 09:00 UTC',
    );
  });
});
