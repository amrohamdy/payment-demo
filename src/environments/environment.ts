export const environment = {
  production: true,
  apiMode: 'http' as 'mock' | 'http',
  /** Replace after deploy, or ship public/runtime-config.json without rebuild. */
  baseUrl: 'https://localhost:7134',
  currency: 'SAR',
  mockLatencyMs: 0,
  authorityProfileId: null as string | null,
};
