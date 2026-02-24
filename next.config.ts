import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // Allow clients to use a relative NEXT_PUBLIC_API_BASE_URL like "/api" while still
    // proxying to the real backend (local in dev, Vercel in prod).
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
        source: '/api/:path*',
        destination: `${normalized}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
