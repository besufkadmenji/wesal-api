import { registerEnumType } from '@nestjs/graphql';

export enum CancellationOutcome {
  NO_CHARGE = 'NO_CHARGE',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  FULL_REFUND = 'FULL_REFUND',
  HELD = 'HELD',
  NOT_CANCELLABLE = 'NOT_CANCELLABLE',
}

registerEnumType(CancellationOutcome, {
  name: 'CancellationOutcome',
  description:
    "What cancelling would do to the customer's payment (BRD 4.1.18)",
});
