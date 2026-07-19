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
});
