import { registerEnumType } from '@nestjs/graphql';

export enum ContractSignatureType {
  CUSTOMER_ACCEPTANCE = 'CUSTOMER_ACCEPTANCE',
  PROVIDER_ACCEPTANCE = 'PROVIDER_ACCEPTANCE',
  CUSTOMER_COMPLETION = 'CUSTOMER_COMPLETION',
}

registerEnumType(ContractSignatureType, {
  name: 'ContractSignatureType',
  description: 'Sprint 3 contract signature purpose',
});
