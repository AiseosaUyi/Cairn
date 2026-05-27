/**
 * Runtime Cache wrapper — `@vercel/functions`'s getCache(), keyed by a
 * stable hash so identical inputs hit the same row.
 *
 * Why cache coaching responses:
 *   - Same URL reviewed twice in a day → no need to re-burn tokens.
 *   - Same draft scored twice (user reopens the workspace) → instant.
 *   - Examples for the same task → identical 90% of the time.
 *
 * Why NOT cache:
 *   - Per-task chat responses (each turn is unique, by design)
 *   - Anything where freshness matters more than cost
 *
 * Tags let the user "force refresh" by invalidating a single key + tag
 * (the workspace surfaces a Refresh button on examples / portfolio review).
 */

import { getCache } from '@vercel/functions';
import { createHash } from 'node:crypto';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export function cacheKey(parts: Array<string | undefined | null>): string {
  // SHA-256 is overkill but stable + collision-free for the volume we'll
  // see. The string we hash includes a version prefix so a future schema
  // change naturally invalidates the cache without manual purge.
  const blob = ['v1', ...parts.map((p) => p ?? '')].join('\x1f');
  return createHash('sha256').update(blob).digest('hex').slice(0, 32);
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const cache = getCache();
    const hit = await cache.get(key);
    return (hit as T | null) ?? null;
  } catch {
    // Cache misses or runtime unavailability are non-fatal — fall through
    // to recompute.
    return null;
  }
}

export async function writeCache<T>(
  key: string,
  value: T,
  opts: { ttl?: number; tags?: string[] } = {},
): Promise<void> {
  try {
    const cache = getCache();
    await cache.set(key, value, {
      ttl: opts.ttl ?? DEFAULT_TTL_SECONDS,
      tags: opts.tags,
    });
  } catch {
    // Non-fatal — caller already has the value.
  }
}

/** read-through wrapper. If a cached result is present, return it.
 *  Otherwise call the producer, cache its result, return it. */
export async function memoize<T>(
  key: string,
  producer: () => Promise<T>,
  opts: { ttl?: number; tags?: string[]; skipCache?: boolean } = {},
): Promise<T> {
  if (!opts.skipCache) {
    const hit = await readCache<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  }
  const fresh = await producer();
  await writeCache(key, fresh, { ttl: opts.ttl, tags: opts.tags });
  return fresh;
}
