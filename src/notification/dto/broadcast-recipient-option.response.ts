import { Field, ObjectType } from '@nestjs/graphql';
import { BroadcastRecipientType } from '../enums/broadcast.enum';

/** A pickable active account for a SELECTED broadcast. */
@ObjectType()
export class BroadcastRecipientOption {
  @Field()
  id: string;

  @Field(() => BroadcastRecipientType)
  type: BroadcastRecipientType;

  @Field()
  name: string;

  @Field({ nullable: true, description: 'Phone or email, to tell names apart' })
  detail?: string;
}
