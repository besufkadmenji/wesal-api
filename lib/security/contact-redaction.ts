const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_CANDIDATE_PATTERN = /(?<!\w)\+?[\d(][\d\s().-]{5,}\d(?!\w)/gu;

export const CONTACT_REDACTION_TOKEN = '[contact hidden]';

/**
 * Removes contact details before chat content is persisted. Phone candidates
 * are only redacted when they contain 7-15 digits, avoiding ordinary prices
 * and identifiers while covering international formatting.
 */
export function redactContactDetails(value: string): string {
  return value
    .replace(EMAIL_PATTERN, CONTACT_REDACTION_TOKEN)
    .replace(PHONE_CANDIDATE_PATTERN, (candidate) => {
      const digits = candidate.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15
        ? CONTACT_REDACTION_TOKEN
        : candidate;
    });
}
