import * as jwt from 'jsonwebtoken';
import { verifySubscriptionPrincipal } from './graphql.module';

describe('verifySubscriptionPrincipal', () => {
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

    expect(
      verifySubscriptionPrincipal({ authorization: `Bearer ${token}` }),
    ).toMatchObject({ sub: 'provider-id', type: 'provider' });
  });

  it('rejects a missing or invalid token', () => {
    expect(() => verifySubscriptionPrincipal()).toThrow('missing token');
    expect(() =>
      verifySubscriptionPrincipal({ Authorization: 'Bearer not-a-jwt' }),
    ).toThrow('invalid token');
  });

  it('rejects expired and non-participant token types', () => {
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

    expect(() =>
      verifySubscriptionPrincipal({ Authorization: `Bearer ${expired}` }),
    ).toThrow('invalid token');
    expect(() =>
      verifySubscriptionPrincipal({ Authorization: `Bearer ${resetToken}` }),
    ).toThrow('invalid token');
  });
});
