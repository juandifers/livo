// src/lib/api.ts
// Re-export convenience barrel for callers that know the environment
export { serverFetchJson } from './api.server';
export { clientFetchJson } from './api.client';