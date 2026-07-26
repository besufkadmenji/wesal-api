import { localizeEnum } from './localize-enum';
import type { TranslatedError } from './i18n.service';

describe('localizeEnum', () => {
  const labels: Record<'REJECTED' | 'UNDER_REVIEW', TranslatedError> = {
    REJECTED: { en: 'Rejected', ar: 'مرفوض' },
    UNDER_REVIEW: { en: 'Under review', ar: 'قيد المراجعة' },
  };

  it('returns the English label for en', () => {
    expect(localizeEnum(labels, 'REJECTED', 'en')).toBe('Rejected');
  });

  it('returns the Arabic label for ar', () => {
    expect(localizeEnum(labels, 'REJECTED', 'ar')).toBe('مرفوض');
  });

  it('falls back to a title-cased value when the label is missing', () => {
    expect(
      localizeEnum(labels, 'UNKNOWN_STATUS' as 'REJECTED', 'en'),
    ).toBe('Unknown Status');
  });
});
