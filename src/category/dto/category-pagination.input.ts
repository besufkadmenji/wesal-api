import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

@InputType()
export class CategoryPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
