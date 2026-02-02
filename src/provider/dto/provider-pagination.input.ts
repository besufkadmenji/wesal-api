import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsInt, Min, IsIn, IsString } from 'class-validator';
import { ProviderStatus } from '../enums/provider-status.enum';

@InputType()
export class ProviderPaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'email', 'createdAt', 'status'])
  sortBy?: string;

  @Field({ nullable: true, defaultValue: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @Field(() => ProviderStatus, { nullable: true })
  @IsOptional()
  status?: ProviderStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
