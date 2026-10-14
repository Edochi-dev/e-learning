import type { CookieOptions, Response } from 'express';
import { SessionTokens } from './services/auth-session.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from './services/session-policy';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const BASE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export function setSessionCookies(res: Response, tokens: SessionTokens): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...BASE_OPTIONS,
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  if (tokens.refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...BASE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
  }
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, BASE_OPTIONS);
  res.clearCookie(REFRESH_TOKEN_COOKIE, BASE_OPTIONS);
}
