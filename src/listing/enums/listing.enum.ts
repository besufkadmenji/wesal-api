import { registerEnumType } from '@nestjs/graphql';

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
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

export enum PromotionStatus {
  NONE = 'NONE',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}

registerEnumType(PromotionStatus, {
  name: 'PromotionStatus',
  description: 'Featured advertisement payment and expiry state',
});
