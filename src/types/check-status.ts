/**
 * Outcome of opening a LinkedIn profile page anonymously.
 *
 * - AVAILABLE:   the profile preview renders (name/headline/followers visible) —
 *                the account exists and opens.
 * - UNAVAILABLE: a redirect to an auth/join wall, the "private / may not exist"
 *                page, or a 404 — the profile does not open.
 * - ERROR:       navigation failed (timeout, DNS, network, etc.).
 *
 * Note: a sign-in modal appears on both AVAILABLE and UNAVAILABLE pages when
 * browsing anonymously, so it is the page *content* / redirect — not the modal —
 * that determines the status.
 */
export enum CheckStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  ERROR = 'ERROR',
}
