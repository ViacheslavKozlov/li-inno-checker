import { describe, it, expect } from 'vitest';
import { formatDate } from './format';

describe('formatDate', () => {
  const date = new Date('2026-06-21T14:30:09.000Z');

  it('renders the default watermark pattern in UTC', () => {
    expect(formatDate(date, 'YYYY-MM-DD HH:mm UTC')).toBe('2026-06-21 14:30 UTC');
  });

  it('supports seconds and arbitrary literal separators', () => {
    expect(formatDate(date, 'DD/MM/YYYY HH:mm:ss')).toBe('21/06/2026 14:30:09');
  });

  it('zero-pads single-digit components', () => {
    expect(formatDate(new Date('2026-01-05T03:07:02.000Z'), 'YYYY-MM-DD HH:mm:ss')).toBe(
      '2026-01-05 03:07:02',
    );
  });

  it('leaves non-token characters untouched', () => {
    expect(formatDate(date, 'Captured YYYY')).toBe('Captured 2026');
  });
});
