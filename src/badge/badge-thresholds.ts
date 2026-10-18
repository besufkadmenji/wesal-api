import { BadgeBound } from './enums/badge-bound.enum';
import { BadgeTier } from './enums/badge-tier.enum';

/** One end of a star range; `inclusive` says whether the value itself is in. */
export interface RangeEnd {
  value: number;
  inclusive: boolean;
}

export interface StarRange {
  lower: RangeEnd;
  upper: RangeEnd;
}

export interface TierRule {
  tier: BadgeTier;
  maxBound: BadgeBound | null;
  minBound: BadgeBound | null;
  enabled: boolean;
}

/** Highest first, so tiers are tried Trust → Diligence → Under-improvement. */
export const TIER_ORDER: BadgeTier[] = [
  BadgeTier.TRUST,
  BadgeTier.DILIGENCE,
  BadgeTier.UNDER_IMPROVEMENT,
];

function parse(bound: BadgeBound): { kind: 'EQ' | 'LT'; stars: number } {
  if (bound === BadgeBound.ZERO) return { kind: 'EQ', stars: 0 };
  const [kind, stars] = bound.split('_');
  return { kind: kind as 'EQ' | 'LT', stars: Number(stars) };
}

/** Upper end for a "max" dropdown: "=4" includes 4, "<4" stops below 4. */
export function upperEnd(bound: BadgeBound): RangeEnd {
  const { kind, stars } = parse(bound);
  return { value: stars, inclusive: kind === 'EQ' };
}

/** Lower end for a "min" dropdown: "=3" starts at 3, "<3" starts above 2. */
export function lowerEnd(bound: BadgeBound): RangeEnd {
  const { kind, stars } = parse(bound);
  return kind === 'EQ'
    ? { value: stars, inclusive: true }
    : { value: stars - 1, inclusive: false };
}

export function rangeOf(rule: {
  maxBound: BadgeBound;
  minBound: BadgeBound;
}): StarRange {
  return { lower: lowerEnd(rule.minBound), upper: upperEnd(rule.maxBound) };
}

export function isEmpty(range: StarRange): boolean {
  if (range.lower.value < range.upper.value) return false;
  return !(
    range.lower.value === range.upper.value &&
    range.lower.inclusive &&
    range.upper.inclusive
  );
}

export function contains(range: StarRange, average: number): boolean {
  const aboveLower = range.lower.inclusive
    ? average >= range.lower.value
    : average > range.lower.value;
  const belowUpper = range.upper.inclusive
    ? average <= range.upper.value
    : average < range.upper.value;
  return aboveLower && belowUpper;
}

export function overlaps(a: StarRange, b: StarRange): boolean {
  const lower =
    a.lower.value > b.lower.value ||
    (a.lower.value === b.lower.value && !a.lower.inclusive)
      ? a.lower
      : b.lower;
  const upper =
    a.upper.value < b.upper.value ||
    (a.upper.value === b.upper.value && !a.upper.inclusive)
      ? a.upper
      : b.upper;
  return !isEmpty({ lower, upper });
}

/**
 * The tier for a provider's average, or null when no enabled tier covers it.
 * Unrated providers never get a badge (they are filtered out before this).
 */
export function resolveTier(
  average: number,
  rules: TierRule[],
): BadgeTier | null {
  for (const tier of TIER_ORDER) {
    const rule = rules.find((candidate) => candidate.tier === tier);
    if (!rule?.enabled || !rule.maxBound || !rule.minBound) continue;
    if (
      contains(
        rangeOf({ maxBound: rule.maxBound, minBound: rule.minBound }),
        average,
      )
    ) {
      return tier;
    }
  }
  return null;
}
