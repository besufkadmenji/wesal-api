import { registerEnumType } from '@nestjs/graphql';

export enum ContractActorType {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

registerEnumType(ContractActorType, {
  name: 'ContractActorType',
});
