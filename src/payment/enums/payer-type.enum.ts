import { registerEnumType } from '@nestjs/graphql';

export enum PayerType {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
}

registerEnumType(PayerType, {
  name: 'PayerType',
  description: 'Entity type that owns the payment',
});
