import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

@InputType()
export class CategoryPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
