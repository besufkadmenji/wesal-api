import { registerEnumType } from '@nestjs/graphql';

export enum NotificationRecipientType {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
}

registerEnumType(NotificationRecipientType, {
  name: 'NotificationRecipientType',
});
