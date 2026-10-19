import {
  localizedNotificationField,
  notificationTexts,
} from './notification-texts';

describe('notificationTexts', () => {
  it('writes the BRD payout text in both languages', () => {
    expect(notificationTexts.payout(1184, 1234.5)).toEqual({
      ar: {
        title: 'تحويل قيمة التعاقد',
        message:
          'تم تحويل قيمة التعاقد رقم (1184) من المنصة، المبلغ (1,234.5) ريال.',
      },
      en: {
        title: 'Payout transferred',
        message:
          'The platform transferred the value of contract #1184: SAR 1,234.5.',
      },
    });
  });

  it('writes the BRD overdue pop-up title in both languages', () => {
    const text = notificationTexts.contractOverdue(1184);
    expect(text.ar.title).toBe('لديك تعاقد يحتاج إلى توقيع وإنهاء');
    expect(text.en.title).toBe(
      'You have a contract that needs to be signed and finalized',
    );
    expect(text.en.message).toContain('1184');
  });

  it('names the listing in chat notifications', () => {
    const text = notificationTexts.chatStarted('Emergency plumbing');
    expect(text.ar.message).toContain('"Emergency plumbing"');
    expect(text.en.message).toContain('"Emergency plumbing"');
  });
});

describe('localizedNotificationField', () => {
  const notification = {
    title: 'تحديث التعاقد',
    message: 'رسالة',
    translations: { en: { title: 'Contract update', message: 'Message' } },
  };

  it("returns the reader's language when a copy exists", () => {
    expect(localizedNotificationField(notification, 'title', 'en')).toBe(
      'Contract update',
    );
    expect(localizedNotificationField(notification, 'message', 'ar')).toBe(
      'رسالة',
    );
  });

  it('falls back to the stored text for old single-language rows', () => {
    expect(
      localizedNotificationField(
        { title: 'Old', message: 'Row', translations: null },
        'title',
        'ar',
      ),
    ).toBe('Old');
  });
});
