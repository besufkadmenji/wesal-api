import { registerEnumType } from '@nestjs/graphql';

export enum NotificationRecipientType {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

registerEnumType(NotificationRecipientType, {
  name: 'NotificationRecipientType',
});
