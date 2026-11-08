import { clientIp, UploadRateLimiter } from './upload-rate-limit';

describe('UploadRateLimiter', () => {
  it('allows up to the limit per IP within the window, then refuses', () => {
    let now = 0;
    const limiter = new UploadRateLimiter(2, 1000, () => now);
    expect(limiter.tryConsume('1.1.1.1')).toBe(true);
    expect(limiter.tryConsume('1.1.1.1')).toBe(true);
    expect(limiter.tryConsume('1.1.1.1')).toBe(false);
    // Another IP has its own allowance.
    expect(limiter.tryConsume('2.2.2.2')).toBe(true);
    // Once the window passes, the first IP can upload again.
    now = 1000;
    expect(limiter.tryConsume('1.1.1.1')).toBe(true);
  });
});

describe('clientIp', () => {
  it('uses the first forwarded address', () => {
    expect(
      clientIp({ headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.1' } }),
    ).toBe('5.6.7.8');
  });

  it('falls back to the socket address', () => {
    expect(
      clientIp({ headers: {}, socket: { remoteAddress: '9.9.9.9' } }),
    ).toBe('9.9.9.9');
  });
});
