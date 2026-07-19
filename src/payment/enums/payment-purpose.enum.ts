import { registerEnumType } from '@nestjs/graphql';

export enum PaymentPurpose {
  CONTRACT = 'CONTRACT',
  CHAT_CUSTOMER = 'CHAT_CUSTOMER',
  CHAT_PROVIDER = 'CHAT_PROVIDER',
  PREMIUM_AD = 'PREMIUM_AD',
}

registerEnumType(PaymentPurpose, {
  name: 'PaymentPurpose',
  description: 'Business obligation settled by a payment',
});
