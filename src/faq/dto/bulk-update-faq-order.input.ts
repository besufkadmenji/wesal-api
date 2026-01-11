import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsString, IsInt } from 'class-validator';

@InputType()
export class UpdateFaqOrderInput {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field(() => Int)
  @IsInt()
  order: number;
}

@InputType()
export class BulkUpdateFaqOrderInput {
  @Field(() => [UpdateFaqOrderInput])
  items: UpdateFaqOrderInput[];
}
