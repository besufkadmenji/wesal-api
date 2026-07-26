import { registerEnumType } from '@nestjs/graphql';

export enum ContractSettlementType {
  HOLD = 'HOLD',
  CUSTOMER_REFUND = 'CUSTOMER_REFUND',
  PROVIDER_RELEASE = 'PROVIDER_RELEASE',
  PLATFORM_COMMISSION = 'PLATFORM_COMMISSION',
  VAT = 'VAT',
}

registerEnumType(ContractSettlementType, {
  name: 'ContractSettlementType',
  description: 'Append-only mock allocation of a settled contract payment',
});
