import { registerEnumType } from '@nestjs/graphql';

export enum ContractSignatureType {
  CUSTOMER_ACCEPTANCE = 'CUSTOMER_ACCEPTANCE',
  PROVIDER_ACCEPTANCE = 'PROVIDER_ACCEPTANCE',
  PROVIDER_COMPLETION = 'PROVIDER_COMPLETION',
  CUSTOMER_COMPLETION = 'CUSTOMER_COMPLETION',
}

registerEnumType(ContractSignatureType, {
  name: 'ContractSignatureType',
  description: 'Contract acceptance or completion signature purpose',
});
