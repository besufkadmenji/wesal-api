import { registerEnumType } from '@nestjs/graphql';

export enum BankStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

registerEnumType(BankStatus, {
  name: 'BankStatus',
  description: 'Status of the bank',
});
