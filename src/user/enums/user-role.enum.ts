import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
}

// Register enum for GraphQL
registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role enumeration',
});
