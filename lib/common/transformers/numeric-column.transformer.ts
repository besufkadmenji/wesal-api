import type { ValueTransformer } from 'typeorm';

/** Postgres returns `numeric` columns as strings; expose them as numbers. */
export const numericColumnTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};
