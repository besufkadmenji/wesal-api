const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;

// S4-66: links. A scheme or "www." hides everything up to the next space;
// bare domains only match a fixed list of common TLDs, so prices ("3.50")
// and ordinary sentences ("done.ok") are left alone. Messaging short links
// (wa.me, t.me) are bare domains on ".me".
const SCHEME_URL_PATTERN = /\b(?:https?|ftp):\/\/\S+/giu;
const WWW_URL_PATTERN = /\bwww\.\S+/giu;
const BARE_DOMAIN_PATTERN =
  /(?<![\w@.])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|net|org|sa|me|io|co|app|info|biz|link|ly|gg|xyz|online|store|site|tv|ai)(?![a-z0-9-])(?:[/?#]\S*)?/giu;

// Arabic-Indic (٠-٩) and Persian (۰-۹) digits count as digits too.
const DIGIT = '[0-9٠-٩۰-۹]';
const PHONE_CANDIDATE_PATTERN = new RegExp(
  `(?<!\\w)\\+?(?:${DIGIT}|\\()(?:${DIGIT}|[\\s().-]){5,}${DIGIT}(?!\\w)`,
  'gu',
);
const NON_DIGIT = /[^0-9٠-٩۰-۹]/gu;

export const CONTACT_REDACTION_TOKEN = '[contact hidden]';

/**
 * Removes contact details before chat content is persisted: emails, links
 * (S4-66) and phone numbers. Phone candidates are only redacted when they
 * contain 7-15 digits (ASCII, Arabic-Indic or Persian), avoiding ordinary
 * prices and identifiers while covering international formatting.
 */
export function redactContactDetails(value: string): string {
  return value
    .replace(EMAIL_PATTERN, CONTACT_REDACTION_TOKEN)
    .replace(SCHEME_URL_PATTERN, CONTACT_REDACTION_TOKEN)
    .replace(WWW_URL_PATTERN, CONTACT_REDACTION_TOKEN)
    .replace(BARE_DOMAIN_PATTERN, CONTACT_REDACTION_TOKEN)
    .replace(PHONE_CANDIDATE_PATTERN, (candidate) => {
      const digits = candidate.replace(NON_DIGIT, '');
      return digits.length >= 7 && digits.length <= 15
        ? CONTACT_REDACTION_TOKEN
        : candidate;
    });
}
