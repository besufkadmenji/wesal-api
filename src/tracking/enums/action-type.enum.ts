import { registerEnumType } from '@nestjs/graphql';

export enum ActionType {
  VIEW = 'VIEW',
  CLICK = 'CLICK',
}

registerEnumType(ActionType, {
  name: 'ActionType',
  description: 'Type of user action (view or click)',
});
