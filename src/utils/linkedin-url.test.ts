import { describe, expect, it } from 'vitest';
import { isLinkedInUrl, normalizeLinkedInUrl } from './linkedin-url';

describe('normalizeLinkedInUrl', () => {
  it('canonicalizes a standard profile URL', () => {
    expect(normalizeLinkedInUrl('https://www.linkedin.com/in/satyanadella/')).toBe(
      'https://www.linkedin.com/in/satyanadella',
    );
  });

  it('accepts input without a scheme', () => {
    expect(normalizeLinkedInUrl('linkedin.com/in/john-doe')).toBe(
      'https://www.linkedin.com/in/john-doe',
    );
  });

  it('accepts country subdomains and drops query/hash', () => {
    expect(normalizeLinkedInUrl('https://uk.linkedin.com/in/jane?trk=abc#section')).toBe(
      'https://www.linkedin.com/in/jane',
    );
  });

  it('supports company pages', () => {
    expect(normalizeLinkedInUrl('https://www.linkedin.com/company/microsoft/about/')).toBe(
      'https://www.linkedin.com/company/microsoft',
    );
  });

  it('rejects non-LinkedIn hosts', () => {
    expect(normalizeLinkedInUrl('https://example.com/in/someone')).toBeNull();
  });

  it('rejects non-entity LinkedIn paths', () => {
    expect(normalizeLinkedInUrl('https://www.linkedin.com/feed/')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(normalizeLinkedInUrl('not a url')).toBeNull();
    expect(normalizeLinkedInUrl('')).toBeNull();
  });

  it('isLinkedInUrl mirrors normalize', () => {
    expect(isLinkedInUrl('https://www.linkedin.com/in/x')).toBe(true);
    expect(isLinkedInUrl('https://twitter.com/x')).toBe(false);
  });
});
