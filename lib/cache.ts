// lib/cache.ts
import { LRUCache } from 'lru-cache';

const options = {
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
};

export const cache = new LRUCache(options);