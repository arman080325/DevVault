/**
 * DevVault — In-Memory Sliding Window Rate Limiter
 * 
 * Provides per-identity rate limiting with automatic pruning.
 */

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetMs: number;
  totalLimit: number;
}

export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  private lastPrunedAt: number = Date.now();

  constructor(maxRequests: number = 30, windowMs: number = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Evaluates if a request from the given key should be rate limited.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Periodic sweep of stale entries (every 5 minutes or > 5000 keys)
    if (now - this.lastPrunedAt > 5 * 60 * 1000 || this.requests.size > 5000) {
      this.prune(windowStart);
      this.lastPrunedAt = now;
    }

    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      this.requests.set(key, timestamps);
      return {
        limited: true,
        remaining: 0,
        resetMs,
        totalLimit: this.maxRequests,
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    return {
      limited: false,
      remaining: this.maxRequests - timestamps.length,
      resetMs: this.windowMs,
      totalLimit: this.maxRequests,
    };
  }

  /**
   * Removes stale keys whose timestamps are all outside the sliding window.
   */
  private prune(cutoff: number): void {
    for (const [key, timestamps] of this.requests.entries()) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, active);
      }
    }
  }

  /**
   * Resets rate limits for a specific key or all keys.
   */
  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

/**
 * Global rate limiter instance: 30 requests per 60 seconds per user.
 */
export const metadataRateLimiter = new SlidingWindowRateLimiter(30, 60 * 1000);
