export const environment = {
  production: false,
  apiMode: 'mock' as 'mock' | 'http',
  /** Host only — paths are `/api/dhamen/...`. Override via runtime-config.json or UI. */
  baseUrl: 'https://localhost:7134',
  currency: 'SAR',
  mockLatencyMs: 350,
  authorityProfileId: null as string | null,
};
