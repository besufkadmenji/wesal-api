import { registerEnumType } from '@nestjs/graphql';

export enum TargetType {
  CATEGORY = 'CATEGORY',
  LISTING = 'LISTING',
}

registerEnumType(TargetType, {
  name: 'TargetType',
  description: 'Type of target being tracked (category or listing)',
});
