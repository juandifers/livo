const FALLBACK_API_BASE_URL = 'https://livo-backend-api.vercel.app/api';

const rawClientApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || FALLBACK_API_BASE_URL;

export function getClientApiBaseUrl() {
  if (typeof window === 'undefined') {
    return rawClientApiBaseUrl;
  }

  try {
    const resolved = new URL(rawClientApiBaseUrl, window.location.origin);
    if (resolved.origin === window.location.origin) {
      return resolved.pathname.replace(/\/$/, '') || '/';
    }
  } catch {
    // Fall through to the same-origin proxy when the configured value is invalid.
  }

  // Use the app's proxy for cross-origin browser calls to avoid CORS/preflight failures.
  return '/api';
}
