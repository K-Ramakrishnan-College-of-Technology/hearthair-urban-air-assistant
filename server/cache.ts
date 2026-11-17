interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Bounded LRU + TTL cache to avoid redundant upstream GenAI API calls
 * and minimize token latency for identical household/city queries.
 */
export class TtlLruCache<T> {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(maxEntries = 100, ttlMs = 15 * 60 * 1000) {
    this.maxEntries = Math.max(1, maxEntries);
    this.ttlMs = Math.max(1, ttlMs);
  }

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (now >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency in Map iteration order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: now + this.ttlMs,
    });
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}
