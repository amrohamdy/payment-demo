import { environment } from '../../../environments/environment';

export interface RuntimeConfig {
  baseUrl: string;
  currency: string;
  authorityProfileId: string | null;
}

const STORAGE_KEY = 'dhamen-runtime-config-v1';

let cached: RuntimeConfig | null = null;

export function defaultRuntimeConfig(): RuntimeConfig {
  return {
    baseUrl: environment.baseUrl.replace(/\/$/, ''),
    currency: environment.currency,
    authorityProfileId: environment.authorityProfileId ?? null,
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  if (cached) {
    return cached;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
      cached = {
        ...defaultRuntimeConfig(),
        ...pickConfig(parsed),
        baseUrl: String(parsed.baseUrl ?? environment.baseUrl).replace(/\/$/, ''),
      };
      return cached;
    }
  } catch {
    // fall through
  }
  cached = defaultRuntimeConfig();
  return cached;
}

export function saveRuntimeConfig(patch: Partial<RuntimeConfig>): RuntimeConfig {
  const next: RuntimeConfig = {
    ...getRuntimeConfig(),
    ...pickConfig(patch),
    baseUrl: String(patch.baseUrl ?? getRuntimeConfig().baseUrl).replace(/\/$/, ''),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  cached = next;
  return next;
}

export function clearRuntimeConfigCache(): void {
  cached = null;
}

/** Load optional public/runtime-config.json overrides (no rebuild needed after deploy). */
export async function loadRuntimeConfigFromFile(): Promise<RuntimeConfig> {
  try {
    const res = await fetch('/runtime-config.json', { cache: 'no-store' });
    if (res.ok) {
      const file = (await res.json()) as Partial<RuntimeConfig>;
      const merged: RuntimeConfig = {
        ...defaultRuntimeConfig(),
        ...pickConfig(file),
        baseUrl: String(file.baseUrl ?? environment.baseUrl).replace(/\/$/, ''),
      };
      // File wins over env defaults, but localStorage wins over file for demo switching.
      const local = localStorage.getItem(STORAGE_KEY);
      if (!local) {
        cached = merged;
        return cached;
      }
    }
  } catch {
    // file optional
  }
  return getRuntimeConfig();
}

function pickConfig(source: Partial<RuntimeConfig>): Partial<RuntimeConfig> {
  const next: Partial<RuntimeConfig> = {};
  if (source.baseUrl != null) next.baseUrl = String(source.baseUrl).replace(/\/$/, '');
  if (source.currency != null) next.currency = String(source.currency);
  if (source.authorityProfileId !== undefined) {
    next.authorityProfileId = source.authorityProfileId ? String(source.authorityProfileId) : null;
  }
  return next;
}
