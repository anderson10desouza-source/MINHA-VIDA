import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient | null> | null = null;

async function resolveConfig(): Promise<{ url: string; publishableKey: string } | null> {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const envKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || '';

  if (envUrl && envKey) {
    return { url: envUrl, publishableKey: envKey };
  }

  try {
    const res = await fetch('/api/supabase/config');
    if (!res.ok) return null;
    const data = (await res.json()) as {
      configured?: boolean;
      url?: string;
      publishableKey?: string;
    };
    if (data.configured && data.url && data.publishableKey) {
      return { url: data.url, publishableKey: data.publishableKey };
    }
  } catch {
    // Offline or API unavailable; localStorage remains active
  }
  return null;
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!clientPromise) {
    clientPromise = resolveConfig().then((cfg) => {
      if (!cfg) return null;
      return createClient(cfg.url, cfg.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    });
  }
  return clientPromise;
}

export interface CloudStateFetchResult {
  ok: boolean;
  state: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  updatedAt: string | null;
  needsSchema?: boolean;
  error?: string;
}

export async function fetchCloudState(accessToken: string): Promise<CloudStateFetchResult> {
  try {
    const res = await fetch('/api/supabase/state', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = (await res.json()) as Partial<CloudStateFetchResult>;
    if (!res.ok) {
      return {
        ok: false,
        state: null,
        profile: null,
        updatedAt: null,
        needsSchema: Boolean(data.needsSchema),
        error: data.error || 'Erro ao carregar dados da conta.',
      };
    }
    return {
      ok: true,
      state: (data.state as Record<string, unknown> | null) ?? null,
      profile: (data.profile as Record<string, unknown> | null) ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  } catch {
    return {
      ok: false,
      state: null,
      profile: null,
      updatedAt: null,
      error: 'Sem conexão com o servidor.',
    };
  }
}

export async function saveCloudState(
  accessToken: string,
  state: unknown
): Promise<{ ok: boolean; updatedAt?: string; needsSchema?: boolean; error?: string }> {
  try {
    const res = await fetch('/api/supabase/state', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ state }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      updatedAt?: string;
      needsSchema?: boolean;
      error?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        needsSchema: Boolean(data.needsSchema),
        error: data.error || 'Erro ao salvar dados na nuvem.',
      };
    }
    return { ok: true, updatedAt: data.updatedAt };
  } catch {
    return { ok: false, error: 'Sem conexão com o servidor.' };
  }
}
