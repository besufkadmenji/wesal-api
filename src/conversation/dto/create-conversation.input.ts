import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class CreateConversationInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  listingId: string;

  // The customer (userId) is taken from the authenticated token and the
  // provider (providerId) is derived from the listing — never from the client.
}
