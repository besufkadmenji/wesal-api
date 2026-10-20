import { registerEnumType } from '@nestjs/graphql';

/**
 * The BRD 4.3.18 dropdown values. `EQ_x` is exactly x stars; `LT_x` is the
 * band just below x (above x - 1); `ZERO` is "zero stars" (min only).
 */
export enum BadgeBound {
  EQ_5 = 'EQ_5',
  EQ_4 = 'EQ_4',
  LT_4 = 'LT_4',
  EQ_3 = 'EQ_3',
  LT_3 = 'LT_3',
  EQ_2 = 'EQ_2',
  LT_2 = 'LT_2',
  EQ_1 = 'EQ_1',
  LT_1 = 'LT_1',
  ZERO = 'ZERO',
}

registerEnumType(BadgeBound, {
  name: 'BadgeBound',
  description: 'Badge threshold dropdown value (=5, =4, <4, … , zero stars)',
});
