import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { IsOptional, Min, Max } from 'class-validator';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortOrder, {
  name: 'SortOrder',
  description: 'Sort order direction',
});

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, {
    defaultValue: 10,
    description: 'Number of items per page',
  })
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @Field(() => SortOrder, {
    nullable: true,
    description: 'Sort order: ASC or DESC',
  })
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;
}
