import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNumber, IsUUID, Min } from 'class-validator';

@InputType()
export class ContractQuoteInput {
  @Field()
  @IsUUID()
  conversationId: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  agreedPrice: number;
}
