import { registerEnumType } from '@nestjs/graphql';

export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

registerEnumType(CategoryStatus, {
  name: 'CategoryStatus',
  description: 'Category publication status',
});
