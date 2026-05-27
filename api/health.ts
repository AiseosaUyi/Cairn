/**
 * /api/health — runtime diagnostic for the serverless functions.
 *
 * Visit https://your-deploy.vercel.app/api/health in a browser. Returns
 * JSON describing what the function can see at runtime. NO secrets in
 * the response — only booleans + lengths + non-secret env values, so
 * it's safe to leave on in production.
 *
 * Use this when something downstream (chat, transcribe) is failing and
 * you need to know whether the env var is even reaching the function.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const key = process.env.OPENAI_API_KEY ?? '';
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    node: process.version,
    region: process.env.VERCEL_REGION ?? null,
    deploy: {
      vercel_env: process.env.VERCEL_ENV ?? null,
      git_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    openai: {
      key_present: key.length > 0,
      key_length: key.length,
      key_prefix: key ? `${key.slice(0, 7)}…${key.slice(-4)}` : null,
      model: process.env.LLM_MODEL ?? '(default: gpt-4.1-mini)',
    },
    supabase: {
      url_present: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      service_role_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    site_url: process.env.EXPO_PUBLIC_SITE_URL ?? null,
  });
}
