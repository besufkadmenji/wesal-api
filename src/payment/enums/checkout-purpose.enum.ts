import { registerEnumType } from '@nestjs/graphql';

/** What a checkout pays for (S4-10). */
export enum CheckoutPurpose {
  CONTRACT = 'CONTRACT',
  /** The signed-in participant's chat fee for the current cycle. */
  CHAT_FEE = 'CHAT_FEE',
  /** A featured listing waiting for its premium fee. */
  PREMIUM_AD = 'PREMIUM_AD',
}

registerEnumType(CheckoutPurpose, {
  name: 'CheckoutPurpose',
  description: 'What a payment checkout pays for',
});
