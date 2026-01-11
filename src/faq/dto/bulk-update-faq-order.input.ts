import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsUUID } from 'class-validator';

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
  items: UpdateFaqOrderInput[];
}
