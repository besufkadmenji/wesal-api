import { registerEnumType } from '@nestjs/graphql';

/** Who an admin broadcast can target (BRD 4.3.24). */
export enum BroadcastRecipientType {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
}

registerEnumType(BroadcastRecipientType, {
  name: 'BroadcastRecipientType',
  description: 'Broadcast target: customers (USER) or service providers',
});

export enum BroadcastAudience {
  ALL = 'ALL',
  SELECTED = 'SELECTED',
}

registerEnumType(BroadcastAudience, {
  name: 'BroadcastAudience',
  description: 'All active accounts of the chosen types, or a hand-picked list',
});
