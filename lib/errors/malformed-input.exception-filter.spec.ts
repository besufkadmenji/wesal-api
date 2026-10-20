import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { QueryFailedError } from 'typeorm';
import {
  MALFORMED_INPUT_MESSAGE,
  MalformedInputExceptionFilter,
} from './malformed-input.exception-filter';

const dbError = (code: string) =>
  new QueryFailedError(
    'SELECT 1',
    [],
    Object.assign(new Error('db'), { code }),
  );

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

const graphqlHost = (language: string) => {
  jest.spyOn(GqlArgumentsHost, 'create').mockReturnValue({
    getContext: () => ({ req: { headers: { 'accept-language': language } } }),
  } as unknown as GqlArgumentsHost);
  return { getType: () => 'graphql' } as unknown as ArgumentsHost;
};

/** H-36: malformed ids reached Postgres and came back as a raw 500. */
describe('MalformedInputExceptionFilter', () => {
  const filter = new MalformedInputExceptionFilter();

  afterEach(() => jest.restoreAllMocks());

  it('answers a malformed id on REST with a localized 400', () => {
    const { host, status, json } = httpHost('ar');
    filter.catch(dbError('22P02'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: MALFORMED_INPUT_MESSAGE.ar,
    });
  });

  it('throws a 400 for GraphQL so Apollo reports its status', () => {
    const host = graphqlHost('en');
    let thrown: unknown;
    try {
      filter.catch(dbError('22P02'), host);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BadRequestException);
    expect((thrown as BadRequestException).getResponse()).toEqual({
      statusCode: 400,
      message: MALFORMED_INPUT_MESSAGE.en,
    });
  });

  it('leaves other database errors to the default handling', () => {
    const host = graphqlHost('en');
    const unique = dbError('23505');
    expect(() => filter.catch(unique, host)).toThrow(unique);
  });
});
