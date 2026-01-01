import { registerEnumType } from '@nestjs/graphql';

export enum ComplaintReason {
  FRAUD = 'FRAUD',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  SPAM = 'SPAM',
  MISLEADING_INFORMATION = 'MISLEADING_INFORMATION',
  OFFENSIVE = 'OFFENSIVE',
  COPYRIGHT_VIOLATION = 'COPYRIGHT_VIOLATION',
  OTHER = 'OTHER',
}

registerEnumType(ComplaintReason, {
  name: 'ComplaintReason',
  description: 'Reason for complaint',
});
