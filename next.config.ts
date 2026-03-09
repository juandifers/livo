import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: '/account-setup.html',
        destination: '/account-setup',
        permanent: false,
      },
      {
        source: '/reset-password.html',
        destination: '/reset-password',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // Keep uploads proxied to the backend origin. API requests are handled by
    // src/app/api/[...path]/route.ts so we can normalize forwarded headers.
    const defaultBackend =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/api'
        : 'https://livo-backend-api.vercel.app/api';

    const raw =
      process.env.LIVO_BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      defaultBackend;

    const backendBase = raw && raw.startsWith('http') ? raw : defaultBackend;
    const normalized = backendBase.replace(/\/$/, '');
    const backendOrigin = new URL(normalized).origin;

    return [
      {
        source: '/uploads/:path*',
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
