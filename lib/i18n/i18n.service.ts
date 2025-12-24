import { LanguageCode } from './language.types';

export interface TranslatedError {
  en: string;
  ar: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
}

export class I18nService {
  static translate(message: TranslatedError, language: LanguageCode): string {
    return message[language] || message.en;
  }

  static buildErrorResponse(
    code: string,
    message: TranslatedError,
    statusCode: number,
    language: LanguageCode,
  ): ErrorResponse {
    return {
      code,
      message: this.translate(message, language),
      statusCode,
    };
  }
}
