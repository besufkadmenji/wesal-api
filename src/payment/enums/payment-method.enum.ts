import { registerEnumType } from '@nestjs/graphql';

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
}

registerEnumType(PaymentMethod, {
  name: 'PaymentMethod',
  description: 'Payment method',
});
