import { CheckStatus, type PageSignals, type Classification } from '../types';

/**
 * Final URL contains one of these => LinkedIn bounced us to a generic sign-in /
 * join wall, i.e. the profile did not open for an anonymous visitor.
 */
const UNAVAILABLE_URL_MARKERS = ['/authwall', '/login', '/checkpoint', '/uas/login'];

/**
 * Page text indicating the profile does NOT open — LinkedIn's anonymous
 * "private / may not exist" wall, or a not-found page. (A rendered profile
 * preview also shows sign-in buttons, so generic "sign in" wording alone is not
 * a reliable signal; only this distinctive wording is.)
 */
const UNAVAILABLE_TEXT_MARKERS = [
  'may be private', // "The profile ... may be private."
  'may not exist', // "This profile may be private or may not exist."
  'sign in to access this', // wall CTA on the unavailable page
  "this page doesn't exist",
  'page not found',
  'profile not found',
  'this profile is not available',
  "we couldn't find",
  'no longer available',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pure classification of a fetched LinkedIn page into a {@link CheckStatus}.
 * Kept free of Playwright so it can be unit-tested from fixtures. ERROR is set
 * by the checker on navigation failure, never here.
 *
 * A page is AVAILABLE only when it stayed on the profile and rendered a preview;
 * a redirect to an auth/join wall or any "unavailable" wording => UNAVAILABLE.
 *
 * Returns the matched signal as `reason` (persisted on each check) so that, when
 * LinkedIn changes its wording or redirects and a classification looks wrong,
 * the basis for the verdict is auditable instead of opaque.
 */
export function classifyLinkedInPage(signals: PageSignals): Classification {
  if (signals.httpStatus === 404) {
    return { status: CheckStatus.UNAVAILABLE, reason: 'http-404' };
  }

  const url = signals.finalUrl.toLowerCase();
  const urlMarker = UNAVAILABLE_URL_MARKERS.find((marker) => url.includes(marker));
  if (urlMarker) {
    return { status: CheckStatus.UNAVAILABLE, reason: `url:${urlMarker}` };
  }

  const text = normalize(`${signals.title}\n${signals.pageText}`);
  const textMarker = UNAVAILABLE_TEXT_MARKERS.find((marker) => text.includes(marker));
  if (textMarker) {
    return { status: CheckStatus.UNAVAILABLE, reason: `text:${textMarker}` };
  }

  return { status: CheckStatus.AVAILABLE, reason: 'profile-rendered' };
}
