/** Payment gateway settings, read from the environment with dev defaults. */
export const paymentGatewayConfig = {
  /** Active adapter; only `mock` exists until the real gateways (D-2). */
  get gateway(): string {
    return (process.env.PAYMENT_GATEWAY ?? 'mock').toLowerCase();
  },
  get mockSecret(): string {
    return process.env.PAYMENT_MOCK_SECRET ?? 'wesal-mock-gateway-dev-secret';
  },
  /** Public origin of this API, used for the mock checkout page. */
  get apiPublicUrl(): string {
    return trimSlash(
      process.env.API_PUBLIC_URL ??
        `http://localhost:${process.env.PORT ?? 4000}`,
    );
  },
  /** Public origin of the customer web app (return page). */
  get webAppUrl(): string {
    return trimSlash(process.env.WEB_APP_URL ?? 'http://localhost:3000');
  },
  get isMock(): boolean {
    return paymentGatewayConfig.gateway === 'mock';
  },
};

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
