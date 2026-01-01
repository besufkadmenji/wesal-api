import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { DEFAULT_LANGUAGE, LanguageCode } from './language.types';

const extractLanguageFromHeaders = (acceptLanguage?: string): LanguageCode => {
  if (!acceptLanguage) return DEFAULT_LANGUAGE;

  const languages = acceptLanguage
    .split(',')
    .map((lang) => lang.trim().split(';')[0].toLowerCase());

  return languages.some((lang) => lang === 'ar' || lang.startsWith('ar-'))
    ? 'ar'
    : 'en';
};

export const GetLanguage = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): LanguageCode => {
    const ctxType = ctx.getType<'http' | 'graphql'>();

    let headers: Record<string, string | undefined> | undefined;

    if (ctxType === 'http') {
      const request: {
        headers?: Record<string, string>;
        raw?: { headers: Record<string, string> };
      } = ctx.switchToHttp().getRequest();
      headers = request?.headers ?? request?.raw?.headers;
    }

    if (ctxType === 'graphql') {
      const gqlCtx: {
        getContext(): { req: { headers: Record<string, string> } };
      } = GqlExecutionContext.create(ctx);
      const request = gqlCtx.getContext()?.req;
      headers = request?.headers;
    }

    return extractLanguageFromHeaders(headers?.['accept-language']);
  },
);
