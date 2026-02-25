import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationInput } from 'lib/common/dto/pagination.input';
import { CategoryStatus } from '../enum/category.enum';

@InputType()
export class CategoryPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => CategoryStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}
