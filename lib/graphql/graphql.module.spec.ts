import * as jwt from 'jsonwebtoken';
import { verifySubscriptionConnection } from './graphql.module';

describe('verifySubscriptionConnection', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'subscription-test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('accepts a valid user or provider principal', () => {
    const token = jwt.sign(
      { sub: 'provider-id', email: 'provider@example.com', type: 'provider' },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );

    const auth = verifySubscriptionConnection({
      authorization: `Bearer ${token}`,
    });
    expect(auth.principal).toMatchObject({
      sub: 'provider-id',
      type: 'provider',
    });
    expect(auth.admin).toBeUndefined();
  });

  it('accepts a valid admin access token as an admin, not a participant', () => {
    const token = jwt.sign(
      {
        sub: 'admin-id',
        email: 'admin@example.com',
        permissionType: 'SUPER_ADMIN',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );

    const auth = verifySubscriptionConnection({
      Authorization: `Bearer ${token}`,
    });
    expect(auth.admin).toMatchObject({ sub: 'admin-id' });
    expect(auth.principal).toBeUndefined();
  });

  it('treats a connection without a token as anonymous', () => {
    expect(verifySubscriptionConnection()).toEqual({});
    expect(verifySubscriptionConnection({ 'accept-language': 'ar' })).toEqual(
      {},
    );
  });

  it('rejects a malformed or invalid token', () => {
    expect(() =>
      verifySubscriptionConnection({ Authorization: 'Bearer not-a-jwt' }),
    ).toThrow('invalid token');
    expect(() =>
      verifySubscriptionConnection({ Authorization: 'Token abc' }),
    ).toThrow('invalid token');
  });

  it('rejects expired and reset token types', () => {
    const expired = jwt.sign(
      {
        sub: 'user-id',
        email: 'user@example.com',
        type: 'user',
        exp: Math.floor(Date.now() / 1000) - 1,
      },
      process.env.JWT_SECRET!,
    );
    const resetToken = jwt.sign(
      { sub: 'user-id', type: 'password_reset' },
      process.env.JWT_SECRET!,
    );
    const adminResetToken = jwt.sign(
      { sub: 'admin-id', type: 'admin_password_reset' },
      process.env.JWT_SECRET!,
    );

    for (const token of [expired, resetToken, adminResetToken]) {
      expect(() =>
        verifySubscriptionConnection({ Authorization: `Bearer ${token}` }),
      ).toThrow('invalid token');
    }
  });
});
