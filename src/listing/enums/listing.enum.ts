import { registerEnumType } from '@nestjs/graphql';

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

registerEnumType(ListingStatus, {
  name: 'ListingStatus',
  description: 'Listing publication status',
});

export enum ListingType {
  FREE = 'FREE',
  FEATURED = 'FEATURED',
}

registerEnumType(ListingType, {
  name: 'ListingType',
  description: 'Listing type (free or featured)',
});
