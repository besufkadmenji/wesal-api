import { registerEnumType } from '@nestjs/graphql';

export enum AdvertisementStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

registerEnumType(AdvertisementStatus, {
  name: 'AdvertisementStatus',
  description: 'Advertisement status',
});
