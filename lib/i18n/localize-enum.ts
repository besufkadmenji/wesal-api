import { I18nService, type TranslatedError } from './i18n.service';
import type { LanguageCode } from './language.types';

export const localizeEnum = <T extends string>(
  labels: Record<T, TranslatedError>,
  value: T,
  language: LanguageCode,
): string => {
  const translated = labels[value];
  if (!translated) {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }
  return I18nService.translate(translated, language);
};
