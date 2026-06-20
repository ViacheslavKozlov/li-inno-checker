/** Path segments that identify a LinkedIn entity page we are willing to track. */
const TRACKABLE_SEGMENTS = ['in', 'company', 'school', 'pub'];

const LINKEDIN_HOST = /(^|\.)linkedin\.com$/i;

/**
 * Validate and canonicalize a LinkedIn profile/entity URL.
 *
 * Accepts inputs with or without a scheme and on any linkedin.com subdomain
 * (e.g. `uk.linkedin.com`), and returns a canonical
 * `https://www.linkedin.com/<segment>/<slug>` form. Returns `null` when the
 * input is not a recognizable LinkedIn entity URL.
 */
export function normalizeLinkedInUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (!LINKEDIN_HOST.test(parsed.hostname)) return null;

  const match = parsed.pathname.match(/^\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;

  const segment = match[1]!.toLowerCase();
  if (!TRACKABLE_SEGMENTS.includes(segment)) return null;

  // decodeURIComponent throws URIError on malformed escapes (e.g. ".../in/%E0%A4");
  // treat any such input as simply not a recognizable URL rather than crashing.
  let slug: string;
  try {
    slug = decodeURIComponent(match[2]!).trim();
  } catch {
    return null;
  }
  if (!slug) return null;

  return `https://www.linkedin.com/${segment}/${slug}`;
}

export function isLinkedInUrl(input: string): boolean {
  return normalizeLinkedInUrl(input) !== null;
}
