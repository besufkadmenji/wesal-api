import {
  contains,
  isEmpty,
  lowerEnd,
  overlaps,
  rangeOf,
  resolveTier,
  TierRule,
  upperEnd,
} from './badge-thresholds';
import { BadgeBound } from './enums/badge-bound.enum';
import { BadgeTier } from './enums/badge-tier.enum';

const rule = (
  tier: BadgeTier,
  maxBound: BadgeBound,
  minBound: BadgeBound,
  enabled = true,
): TierRule => ({ tier, maxBound, minBound, enabled });

describe('badge thresholds', () => {
  it('reads "=x" as exactly x and "<x" as the band above x - 1', () => {
    expect(upperEnd(BadgeBound.EQ_4)).toEqual({ value: 4, inclusive: true });
    expect(upperEnd(BadgeBound.LT_4)).toEqual({ value: 4, inclusive: false });
    expect(lowerEnd(BadgeBound.EQ_3)).toEqual({ value: 3, inclusive: true });
    expect(lowerEnd(BadgeBound.LT_3)).toEqual({ value: 2, inclusive: false });
    expect(lowerEnd(BadgeBound.ZERO)).toEqual({ value: 0, inclusive: true });
    expect(lowerEnd(BadgeBound.LT_1)).toEqual({ value: 0, inclusive: false });
  });

  it.each([
    // [max, min, average, inside]
    [BadgeBound.EQ_5, BadgeBound.EQ_5, 5, true],
    [BadgeBound.EQ_5, BadgeBound.EQ_5, 4.99, false],
    [BadgeBound.EQ_5, BadgeBound.EQ_4, 4.5, true],
    [BadgeBound.EQ_4, BadgeBound.EQ_3, 4, true],
    [BadgeBound.EQ_4, BadgeBound.EQ_3, 3, true],
    [BadgeBound.EQ_4, BadgeBound.EQ_3, 4.01, false],
    [BadgeBound.LT_4, BadgeBound.EQ_3, 3.99, true],
    [BadgeBound.LT_4, BadgeBound.EQ_3, 4, false],
    [BadgeBound.EQ_2, BadgeBound.LT_2, 1.5, true],
    [BadgeBound.EQ_2, BadgeBound.LT_2, 1, false],
    [BadgeBound.LT_3, BadgeBound.ZERO, 0, true],
    [BadgeBound.LT_3, BadgeBound.ZERO, 2.99, true],
    [BadgeBound.LT_3, BadgeBound.ZERO, 3, false],
  ])('max %s / min %s contains %d → %s', (max, min, average, inside) => {
    expect(contains(rangeOf({ maxBound: max, minBound: min }), average)).toBe(
      inside,
    );
  });

  it('treats a min above the max as an empty range', () => {
    expect(
      isEmpty(
        rangeOf({ maxBound: BadgeBound.EQ_3, minBound: BadgeBound.EQ_4 }),
      ),
    ).toBe(true);
    expect(
      isEmpty(
        rangeOf({ maxBound: BadgeBound.LT_3, minBound: BadgeBound.EQ_3 }),
      ),
    ).toBe(true);
    expect(
      isEmpty(
        rangeOf({ maxBound: BadgeBound.EQ_3, minBound: BadgeBound.EQ_3 }),
      ),
    ).toBe(false);
    expect(
      isEmpty(
        rangeOf({ maxBound: BadgeBound.LT_3, minBound: BadgeBound.LT_3 }),
      ),
    ).toBe(false);
  });

  it('detects overlap only when the ranges share a value', () => {
    const trust = rangeOf({
      maxBound: BadgeBound.EQ_5,
      minBound: BadgeBound.EQ_4,
    });
    const diligenceTouching = rangeOf({
      maxBound: BadgeBound.EQ_4,
      minBound: BadgeBound.EQ_3,
    });
    const diligenceBelow = rangeOf({
      maxBound: BadgeBound.LT_4,
      minBound: BadgeBound.EQ_3,
    });
    expect(overlaps(trust, diligenceTouching)).toBe(true);
    expect(overlaps(trust, diligenceBelow)).toBe(false);
    expect(overlaps(diligenceBelow, trust)).toBe(false);
  });

  it('resolves the highest enabled tier that covers the average', () => {
    const rules = [
      rule(BadgeTier.TRUST, BadgeBound.EQ_5, BadgeBound.EQ_4),
      rule(BadgeTier.DILIGENCE, BadgeBound.LT_4, BadgeBound.EQ_3),
      rule(BadgeTier.UNDER_IMPROVEMENT, BadgeBound.LT_3, BadgeBound.ZERO),
    ];
    expect(resolveTier(4.6, rules)).toBe(BadgeTier.TRUST);
    expect(resolveTier(3.5, rules)).toBe(BadgeTier.DILIGENCE);
    expect(resolveTier(2.2, rules)).toBe(BadgeTier.UNDER_IMPROVEMENT);
  });

  it('skips disabled or incomplete tiers', () => {
    const rules: TierRule[] = [
      rule(BadgeTier.TRUST, BadgeBound.EQ_5, BadgeBound.EQ_4, false),
      {
        tier: BadgeTier.DILIGENCE,
        maxBound: null,
        minBound: null,
        enabled: true,
      },
    ];
    expect(resolveTier(4.8, rules)).toBeNull();
    expect(resolveTier(3.5, rules)).toBeNull();
  });
});
