import { registerEnumType } from '@nestjs/graphql';

export enum CityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

registerEnumType(CityStatus, {
  name: 'CityStatus',
  description: 'City activation status',
});
