import { registerEnumType } from '@nestjs/graphql';

export enum DeliveryCompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

registerEnumType(DeliveryCompanyStatus, {
  name: 'DeliveryCompanyStatus',
  description: 'Status of the delivery company',
});
