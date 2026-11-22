import { createClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

let cachedJwksUrl = '';
let cachedJwks = null;
let cachedAdminKey = '';
let cachedAdminClient = null;

export function getPublicSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const publishableKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return {
    configured: Boolean(url && publishableKey),
    url,
    publishableKey,
  };
}

export function getSupabaseAdminClient() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();

  if (!url || !secretKey) {
    return null;
  }

  const cacheKey = `${url}::${secretKey.slice(0, 12)}`;
  if (!cachedAdminClient || cachedAdminKey !== cacheKey) {
    cachedAdminKey = cacheKey;
    cachedAdminClient = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return cachedAdminClient;
}

function getJwksVerifier() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const jwksUrl = (
    process.env.SUPABASE_JWKS_URL ||
    (url ? `${url.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json` : '')
  ).trim();

  if (!jwksUrl) return null;

  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwksUrl = jwksUrl;
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  return cachedJwks;
}

export async function verifySupabaseAccessToken(token) {
  if (!token || typeof token !== 'string') return null;

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const jwks = getJwksVerifier();

  if (jwks && url) {
    try {
      const issuer = `${url.replace(/\/+$/, '')}/auth/v1`;
      const { payload } = await jwtVerify(token, jwks, { issuer });
      if (typeof payload.sub === 'string' && payload.sub.length > 0) {
        return {
          id: payload.sub,
          email: typeof payload.email === 'string' ? payload.email : '',
        };
      }
    } catch {
      // Fallback to Supabase Auth API verification below (supports legacy HS256 or rotated keys)
    }
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  } catch {
    return null;
  }
}
