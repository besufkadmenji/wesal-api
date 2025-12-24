import { Field, ObjectType, Int } from '@nestjs/graphql';
import { Type } from '@nestjs/common';

@ObjectType()
export class PaginationMeta {
  @Field(() => Int, { description: 'Total number of items' })
  total: number;

  @Field(() => Int, { description: 'Current page number' })
  page: number;

  @Field(() => Int, { description: 'Number of items per page' })
  limit: number;

  @Field(() => Int, { description: 'Total number of pages' })
  totalPages: number;

  @Field(() => Boolean, { description: 'Whether there is a next page' })
  hasNext: boolean;

  @Field(() => Boolean, { description: 'Whether there is a previous page' })
  hasPrevious: boolean;
}

export interface IPaginatedType<T> {
  items: T[];
  meta: PaginationMeta;
}

export function Paginated<T>(classRef: Type<T>): Type<IPaginatedType<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements IPaginatedType<T> {
    @Field(() => [classRef], { description: 'List of items' })
    items: T[];

    @Field(() => PaginationMeta, { description: 'Pagination metadata' })
    meta: PaginationMeta;
  }

  return PaginatedType as Type<IPaginatedType<T>>;
}
