/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) break;
      results[index] = await fn(items[index] as T, index);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Simple TTL memo keyed by string. Used to avoid duplicate upstream calls within one fetch cycle. */
export function createTtlMemo<T>(ttlMs: number) {
  const store = new Map<string, { at: number; value: Promise<T> }>();
  return {
    get(key: string, produce: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      const now = Date.now();
      if (hit && now - hit.at < ttlMs) return hit.value;
      const value = produce();
      store.set(key, { at: now, value });
      // If the produce() rejects, evict so the next call can retry.
      value.catch(() => store.delete(key));
      return value;
    },
  };
}
