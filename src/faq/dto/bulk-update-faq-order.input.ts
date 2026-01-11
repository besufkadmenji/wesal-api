import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';

@InputType()
export class UpdateFaqOrderInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @Field(() => Int)
  @IsInt()
  order: number;
}

@InputType()
export class BulkUpdateFaqOrderInput {
  @Field(() => [UpdateFaqOrderInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFaqOrderInput)
  items: UpdateFaqOrderInput[];
}
