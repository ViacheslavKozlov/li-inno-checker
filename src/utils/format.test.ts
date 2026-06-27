import { describe, it, expect } from 'vitest';
import { formatDate, monthName } from './format';

describe('monthName', () => {
  it('maps 1-12 to English month names', () => {
    expect(monthName(1)).toBe('January');
    expect(monthName(6)).toBe('June');
    expect(monthName(12)).toBe('December');
  });

  it('falls back to the number for out-of-range input', () => {
    expect(monthName(0)).toBe('0');
    expect(monthName(13)).toBe('13');
  });
});

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
