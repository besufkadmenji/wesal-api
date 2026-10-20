import { registerEnumType } from '@nestjs/graphql';

export enum RatingStatus {
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
}

registerEnumType(RatingStatus, {
  name: 'RatingStatus',
  description: 'Moderation status of a contract rating',
});
