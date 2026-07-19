import { registerEnumType } from '@nestjs/graphql';

export enum ComplaintMessageAuthorType {
  REPORTER = 'REPORTER',
  ADMIN = 'ADMIN',
}

registerEnumType(ComplaintMessageAuthorType, {
  name: 'ComplaintMessageAuthorType',
});
