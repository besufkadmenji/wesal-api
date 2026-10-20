import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import { exceptionLanguage, respondWith } from '../i18n/exception-host';
import { I18nBadRequestException } from './i18n.exceptions';

/**
 * Postgres errors raised when a request value can't be read as its column's
 * type: invalid text (a malformed UUID, integer or enum), a number out of
 * range, a malformed date.
 */
const MALFORMED_INPUT_CODES = new Set(['22P02', '22003', '22007', '22008']);

export const MALFORMED_INPUT_MESSAGE = {
  en: 'The request has an invalid ID or value.',
  ar: 'الطلب يحتوي على معرّف أو قيمة غير صالحة.',
};

/**
 * H-36: a malformed id (e.g. `city(id: "not-a-uuid")`) used to reach Postgres
 * and come back as a 500 with the raw driver message. It is now a localized
 * 400, on REST and GraphQL. Other database errors keep the default handling.
 */
@Catch(QueryFailedError)
export class MalformedInputExceptionFilter extends BaseExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const code = (exception.driverError as { code?: unknown } | undefined)
      ?.code;
    if (typeof code !== 'string' || !MALFORMED_INPUT_CODES.has(code)) {
      if (host.getType() === 'http') return super.catch(exception, host);
      throw exception;
    }
    respondWith(
      host,
      new I18nBadRequestException(
        MALFORMED_INPUT_MESSAGE,
        exceptionLanguage(host),
      ),
    );
  }
}
