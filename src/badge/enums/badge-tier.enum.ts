import { registerEnumType } from '@nestjs/graphql';

export enum BadgeTier {
  TRUST = 'TRUST',
  DILIGENCE = 'DILIGENCE',
  UNDER_IMPROVEMENT = 'UNDER_IMPROVEMENT',
}

registerEnumType(BadgeTier, {
  name: 'BadgeTier',
  description:
    'Provider badge (BRD 4.3.18): Trust, Diligence, or the Under-improvement title',
});
