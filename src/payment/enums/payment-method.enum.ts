import { registerEnumType } from '@nestjs/graphql';

export enum PaymentMethod {
  MOCK = 'MOCK',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
  /** Full card/mada payment through the card gateway (BRD 4.1.17 option 1). */
  ELECTRONIC = 'ELECTRONIC',
  TABBY = 'TABBY',
  TAMARA = 'TAMARA',
}

registerEnumType(PaymentMethod, {
  name: 'PaymentMethod',
  description: 'Payment method',
});
