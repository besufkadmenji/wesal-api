import { registerEnumType } from '@nestjs/graphql';

export enum ComplaintReporterType {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
}

registerEnumType(ComplaintReporterType, { name: 'ComplaintReporterType' });
