import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { errorMessageRegistry } from 'lib/errors';

export const INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER';

errorMessageRegistry.register({
  [INVALID_PHONE_NUMBER]: {
    en: 'Phone number is invalid for the selected country',
    ar: 'رقم الهاتف غير صالح للدولة المحددة',
  },
});

/**
 * Phone rules keyed by dial code.
 * `min`/`max` apply to the subscriber number (digits after the dial code).
 * `startsWith` is a list of allowed digit prefixes for the subscriber number.
 */
const PHONE_RULES: Record<
  string,
  { min: number; max: number; startsWith?: string[] }
> = {
  '+966': { min: 9, max: 9, startsWith: ['5'] }, // Saudi Arabia
  '+20': { min: 10, max: 10, startsWith: ['10', '11', '12', '15'] }, // Egypt
  '+212': { min: 9, max: 9, startsWith: ['6', '7'] }, // Morocco
  '+962': { min: 8, max: 9, startsWith: ['7'] }, // Jordan
  '+961': { min: 7, max: 8, startsWith: ['3', '7', '81'] }, // Lebanon
  '+965': { min: 8, max: 8, startsWith: ['5', '6', '9'] }, // Kuwait
  '+971': { min: 9, max: 9, startsWith: ['5'] }, // UAE
};

/** Dial codes ordered longest-first so we match greedily (e.g. +212 before +2) */
const DIAL_CODES = Object.keys(PHONE_RULES).sort((a, b) => b.length - a.length);

export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  const dialCode = DIAL_CODES.find((code) => phone.startsWith(code));

  if (!dialCode) {
    // Unknown country — fall back to basic E.164 sanity check (7-15 digits after +)
    return /^\+\d{7,15}$/.test(phone);
  }

  const subscriber = phone.slice(dialCode.length);
  const rules = PHONE_RULES[dialCode];

  if (!/^\d+$/.test(subscriber)) return false;
  if (subscriber.length < rules.min || subscriber.length > rules.max)
    return false;
  if (
    rules.startsWith &&
    !rules.startsWith.some((prefix) => subscriber.startsWith(prefix))
  )
    return false;

  return true;
}

@ValidatorConstraint({ name: 'IsPhoneValid', async: false })
export class IsPhoneValidConstraint implements ValidatorConstraintInterface {
  validate(phone: string): boolean {
    return validatePhone(phone);
  }

  defaultMessage(): string {
    return INVALID_PHONE_NUMBER;
  }
}

export function IsPhoneValid(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsPhoneValidConstraint,
    });
  };
}
