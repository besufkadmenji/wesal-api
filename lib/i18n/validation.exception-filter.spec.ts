import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ValidationExceptionFilter } from './validation.exception-filter';

const httpHost = (language?: string) => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        headers: language ? { 'accept-language': language } : {},
      }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

/** H-23: REST 400s used to crash the filter (GraphQL-only context). */
describe('ValidationExceptionFilter', () => {
  const filter = new ValidationExceptionFilter();

  it('answers a REST validation error with a localized 400', () => {
    const { host, status, json } = httpHost('ar');
    filter.catch(
      new BadRequestException({ message: ['format must be pdf or xlsx'] }),
      host,
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'فشل التحقق' }),
    );
  });

  it('passes other REST 400s through unchanged', () => {
    const { host, status, json } = httpHost();
    filter.catch(new BadRequestException('Invoice not available'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invoice not available' }),
    );
  });

  it('rethrows for GraphQL so the error reaches the client', () => {
    const host = {
      getType: () => 'graphql',
      getArgs: () => [{}, {}, { req: { headers: {} } }, {}],
      getArgByIndex: (index: number) =>
        [{}, {}, { req: { headers: {} } }, {}][index],
    } as unknown as ArgumentsHost;
    const original = new BadRequestException('Domain rule broken');
    expect(() => filter.catch(original, host)).toThrow(original);
    expect(() =>
      filter.catch(new BadRequestException({ message: ['x'] }), host),
    ).toThrow('Validation failed');
  });
});
