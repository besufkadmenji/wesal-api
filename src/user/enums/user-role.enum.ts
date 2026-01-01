import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
}

// Register enum for GraphQL
registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role enumeration',
});
