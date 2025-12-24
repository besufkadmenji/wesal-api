import { registerEnumType } from '@nestjs/graphql';

export enum ComplaintStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

registerEnumType(ComplaintStatus, {
  name: 'ComplaintStatus',
  description: 'Complaint status',
});
