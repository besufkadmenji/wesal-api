import { ArgumentsHost, HttpException } from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import type { LanguageCode } from './language.types';

/** The caller's language for a REST or GraphQL exception filter. */
export const exceptionLanguage = (host: ArgumentsHost): LanguageCode => {
  const request =
    host.getType() === 'http'
      ? host.switchToHttp().getRequest<{ headers?: Record<string, string> }>()
      : GqlArgumentsHost.create(host).getContext<{
          req?: { headers?: Record<string, string> };
        }>()?.req;
  return request?.headers?.['accept-language']?.includes('ar') ? 'ar' : 'en';
};

/**
 * REST: writes the exception as the response. GraphQL: throws it, so Apollo
 * reports it (with its status in `extensions`).
 */
export const respondWith = (
  host: ArgumentsHost,
  exception: HttpException,
): void => {
  if (host.getType() !== 'http') throw exception;
  host
    .switchToHttp()
    .getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>()
    .status(exception.getStatus())
    .json(exception.getResponse());
};
