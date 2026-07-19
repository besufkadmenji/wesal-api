import { registerEnumType } from '@nestjs/graphql';

export enum ContractSignatureType {
  CUSTOMER_ACCEPTANCE = 'CUSTOMER_ACCEPTANCE',
  PROVIDER_ACCEPTANCE = 'PROVIDER_ACCEPTANCE',
}

registerEnumType(ContractSignatureType, {
  name: 'ContractSignatureType',
  description: 'Sprint 3 contract signature purpose',
});
