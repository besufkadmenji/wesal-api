import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import type { LanguageCode } from './language.types';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { I18nService } from './i18n.service';
import { errorMessageRegistry } from '../errors/error-message.registry';

interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const gqlHost = GqlArgumentsHost.create(host);
    const ctx: {
      req: { headers: Record<string, string> };
    } = gqlHost.getContext();
    const request = ctx.req;

    const acceptLanguage = request.headers['accept-language'];
    const language: LanguageCode = acceptLanguage?.includes('ar') ? 'ar' : 'en';

    const exceptionResponse = exception.getResponse() as {
      message?: string | string[] | ValidationError[];
      error?: string;
    };

    // Handle validation errors
    if (Array.isArray(exceptionResponse.message)) {
      const translatedErrors = this.translateValidationErrors(
        exceptionResponse.message,
        language,
      );

      const errorMessage =
        language === 'ar' ? 'فشل التحقق' : 'Validation failed';

      // Re-throw with localized message
      throw new BadRequestException({
        statusCode: 400,
        message: errorMessage,
        errors: translatedErrors,
      });
    }
  }

  private translateValidationErrors(
    errors: (ValidationError | string)[],
    language: LanguageCode,
  ): Record<string, string | string[]> | string[] {
    // Check if errors are structured objects or flat strings
    const firstError = errors[0];

    if (typeof firstError === 'string') {
      // Flat array of error codes/messages - translate each
      return (errors as string[]).map((errorCode) => {
        const translatedMessage = errorMessageRegistry.get(errorCode);
        if (translatedMessage) {
          return I18nService.translate(translatedMessage, language);
        }
        // Return original if no translation found
        return errorCode;
      });
    }

    // Structured ValidationError objects - extract and translate error codes by field
    const result: Record<string, string | string[]> = {};

    for (const error of errors) {
      if (typeof error === 'object' && error !== null) {
        const constraints = error.constraints || {};
        const messages = Object.values(constraints);

        if (messages.length > 0) {
          // Translate each constraint message/error code
          const translatedMessages = messages.map((errorCode) => {
            const translatedMessage = errorMessageRegistry.get(errorCode);
            if (translatedMessage) {
              return I18nService.translate(translatedMessage, language);
            }
            // Return original if no translation found
            return errorCode;
          });

          // For a single constraint, store as string; multiple constraints as array
          result[error.property] =
            translatedMessages.length === 1
              ? translatedMessages[0]
              : translatedMessages;
        }
      }
    }

    return result;
  }
}
