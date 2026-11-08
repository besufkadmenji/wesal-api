/**
 * In-memory, per-IP limit for anonymous uploads (sign-up documents and
 * photos). A soft guard against someone filling storage before an account
 * exists; it resets on restart and isn't shared between API instances.
 */
export class UploadRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records an attempt; false when this IP is over the limit. */
  tryConsume(key: string): boolean {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter(
      (time) => now - time < this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now);
    return true;
  }

  private prune(now: number) {
    for (const [key, times] of this.hits) {
      if (times.every((time) => now - time >= this.windowMs)) {
        this.hits.delete(key);
      }
    }
  }
}

/** The client's IP: first X-Forwarded-For hop (the site's proxy forwards it), else the socket. */
export const clientIp = (request: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  ip?: string;
}): string => {
  const forwarded = request.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim();
  return first || request.ip || request.socket?.remoteAddress || 'unknown';
};
