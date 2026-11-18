import {
  CONTACT_REDACTION_TOKEN,
  redactContactDetails,
} from './contact-redaction';

describe('redactContactDetails', () => {
  it.each([
    'call +966 50 123 4567',
    'email Me@Example.COM please',
    'واتساب 050-123-4567',
  ])('redacts contact details from %s', (content) => {
    expect(redactContactDetails(content)).toContain(CONTACT_REDACTION_TOKEN);
  });

  it('does not redact prices or long transaction identifiers', () => {
    expect(
      redactContactDetails('price 1500 and order 123456789012345678'),
    ).toBe('price 1500 and order 123456789012345678');
  });

  // S4-66
  it.each([
    ['visit https://example.com/page?x=1 now', 'visit [contact hidden] now'],
    ['see http://my-shop.sa', 'see [contact hidden]'],
    ['go to www.example.org/contact', 'go to [contact hidden]'],
    ['chat me on wa.me/966501234567', 'chat me on [contact hidden]'],
    ['telegram t.me/wesal_user', 'telegram [contact hidden]'],
    ['my site is shop.example.com.', 'my site is [contact hidden].'],
    ['تواصل عبر instagram.com/wesal', 'تواصل عبر [contact hidden]'],
    ['BEST-DEALS.CO', '[contact hidden]'],
  ])('hides the link in %s', (content, expected) => {
    expect(redactContactDetails(content)).toBe(expected);
  });

  it.each([
    ['رقمي ٠٥٠١٢٣٤٥٦٧', 'رقمي [contact hidden]'],
    ['اتصل ٠٥٥ ١٢٣ ٤٥٦٧', 'اتصل [contact hidden]'],
    ['Persian ۰۵۰۱۲۳۴۵۶۷', 'Persian [contact hidden]'],
  ])('hides a phone written in Arabic digits: %s', (content, expected) => {
    expect(redactContactDetails(content)).toBe(expected);
  });

  it.each([
    'the price is 350.50 SAR',
    'السعر ٣٥٠ ريال',
    'done.ok, see you at 10.30',
    'version 2.1.3 is fine',
    'e.g. tomorrow',
  ])('leaves ordinary text alone: %s', (content) => {
    expect(redactContactDetails(content)).toBe(content);
  });
});
