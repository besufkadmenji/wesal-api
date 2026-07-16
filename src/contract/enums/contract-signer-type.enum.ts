import { registerEnumType } from '@nestjs/graphql';

export enum ContractSignerType {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
}

registerEnumType(ContractSignerType, {
  name: 'ContractSignerType',
  description: 'Entity type of the contract signer',
});
