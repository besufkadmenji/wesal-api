import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { SignedContractStatus } from '../enums/contract.enum';

@ObjectType()
@InputType('SignedContractInput')
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

  @Field({ nullable: true })
  latitude?: number;

  @Field({ nullable: true })
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

  @Field({ nullable: true })
  contractExpiresAt?: Date | null;

  @Field(() => SignedContractStatus)
  status: SignedContractStatus;
}
