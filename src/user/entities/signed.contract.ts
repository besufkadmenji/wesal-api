import { Field, Float, ObjectType } from '@nestjs/graphql';
import { SignedContractStatus } from '../enums/contract.enum';

@ObjectType()
export class SignedContract {
  @Field()
  serviceProviderName: string;

  @Field()
  commercialName: string;

  @Field()
  phoneNumber: string;

  @Field()
  dialCode: string;

  @Field()
  categoryNameEn: string;

  @Field()
  categoryNameAr: string;

  @Field()
  categoryId: string;

  @Field()
  address: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field()
  platformManagerName: string;

  @Field()
  serviceProviderSignature: string;

  @Field()
  platformManagerSignature: string;

  @Field()
  verifiedWithAbsher: boolean;

  @Field()
  contractSignedAt: Date;

  @Field(() => String, { nullable: true })
  contractExpiresAt?: Date | null;

  @Field(() => SignedContractStatus)
  status: SignedContractStatus;

  @Field(() => String, { nullable: true })
  terminationReason: string | null;
}
