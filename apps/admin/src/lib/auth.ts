// src/lib/auth.ts
'use client';

import Cookies from 'js-cookie';

const TOKEN_KEY = 'token';

export function setToken(token: string) {
  // Note: js-cookie is not httpOnly. Suitable for initial iteration.
  Cookies.set(TOKEN_KEY, token, { sameSite: 'lax' });
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function clearToken() {
  Cookies.remove(TOKEN_KEY);
}