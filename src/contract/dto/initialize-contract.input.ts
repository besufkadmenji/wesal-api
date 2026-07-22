import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class InitializeContractInput {
  @Field()
  @IsUUID()
  conversationId: string;
}
