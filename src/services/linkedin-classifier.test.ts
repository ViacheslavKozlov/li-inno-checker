import { describe, expect, it } from 'vitest';
import { classifyLinkedInPage } from './linkedin-classifier';
import { CheckStatus } from '../types';

const PROFILE_URL = 'https://www.linkedin.com/in/someone';

describe('classifyLinkedInPage', () => {
  it('flags an HTTP 404 as UNAVAILABLE regardless of text', () => {
    expect(
      classifyLinkedInPage({
        finalUrl: PROFILE_URL,
        title: 'Whatever',
        pageText: 'some content',
        httpStatus: 404,
      }),
    ).toBe(CheckStatus.UNAVAILABLE);
  });

  it('flags a redirect to a generic /authwall as UNAVAILABLE', () => {
    expect(
      classifyLinkedInPage({
        finalUrl:
          'https://www.linkedin.com/authwall?trk=gf&sessionRedirect=%2Fin%2Fno-such-person',
        title: 'Join LinkedIn',
        pageText: 'Join LinkedIn. Email. Password. Agree & Join.',
      }),
    ).toBe(CheckStatus.UNAVAILABLE);
  });

  it('detects the anonymous "may be private or may not exist" wall as UNAVAILABLE', () => {
    expect(
      classifyLinkedInPage({
        finalUrl: PROFILE_URL,
        title: 'Sign Up | LinkedIn',
        pageText:
          'The profile "aandrii-lysenko" may be private. This profile may be private or may not exist. ' +
          'Sign in to access this and over 1 billion member profiles on LinkedIn. Continue with Google. Join Now.',
      }),
    ).toBe(CheckStatus.UNAVAILABLE);
  });

  it('detects a not-found page from its text', () => {
    expect(
      classifyLinkedInPage({
        finalUrl: PROFILE_URL,
        title: 'Page not found | LinkedIn',
        pageText: "This page doesn't exist. Check your URL or return to the LinkedIn homepage.",
      }),
    ).toBe(CheckStatus.UNAVAILABLE);
  });

  it('treats a rendered profile preview as AVAILABLE despite the sign-in modal', () => {
    expect(
      classifyLinkedInPage({
        finalUrl: 'https://www.linkedin.com/in/kostyantyn',
        title: 'Kostyantyn Yermashov | LinkedIn',
        pageText:
          "View Kostyantyn's full profile. Kostyantyn can introduce you to 4 people at DOIT Software. " +
          'Kostyantyn Yermashov. Ukraine. Contact info. 434 followers. 419 connections. ' +
          'Join to view profile. Message. Continue with Google. Sign in with Email. Join now.',
        httpStatus: 200,
      }),
    ).toBe(CheckStatus.AVAILABLE);
  });

  it('treats a fully public profile as AVAILABLE', () => {
    expect(
      classifyLinkedInPage({
        finalUrl: 'https://www.linkedin.com/in/williamhgates',
        title: 'Bill Gates | LinkedIn',
        pageText: 'Bill Gates Chair, Gates Foundation Seattle, Washington 40M followers',
        httpStatus: 200,
      }),
    ).toBe(CheckStatus.AVAILABLE);
  });
});
