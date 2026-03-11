interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheItem<any>>();
export const DEFAULT_TTL = 30000; // 30 seconds

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const hit = memoryCache.get(key);
  if (hit && Date.now() - hit.timestamp < ttl) {
    return hit.data as T;
  }
  
  const data = await fetcher();
  memoryCache.set(key, { data, timestamp: Date.now() });
  return data;
}

export function clearCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
