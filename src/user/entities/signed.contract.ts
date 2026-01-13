import { Field, ObjectType } from '@nestjs/graphql';
import { SignedContractStatus } from '../enums/contract.enum';

@ObjectType()
export class SignedContract {
  @Field()
  serviceProviderSignature: string;

  @Field()
  platformManagerSignature: string;

  @Field()
  contractSignedAt: Date;

  @Field(() => String, { nullable: true })
  contractExpiresAt?: Date | null;

  @Field(() => SignedContractStatus)
  status: SignedContractStatus;

  @Field(() => String, { nullable: true })
  terminationReason: string | null;
}
