import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TranslatedError } from '../i18n/i18n.service';
import { LanguageCode } from '../i18n/language.types';

export class I18nBadRequestException extends BadRequestException {
  constructor(message: TranslatedError, language: LanguageCode) {
    super({
      statusCode: 400,
      message: message[language],
    });
  }
}

export class I18nNotFoundException extends NotFoundException {
  constructor(message: TranslatedError, language: LanguageCode) {
    super({
      statusCode: 404,
      message: message[language],
    });
  }
}

export class I18nConflictException extends ConflictException {
  constructor(message: TranslatedError, language: LanguageCode) {
    super({
      statusCode: 409,
      message: message[language],
    });
  }
}
