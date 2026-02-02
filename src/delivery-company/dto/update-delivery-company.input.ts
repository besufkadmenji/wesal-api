import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateDeliveryCompanyInput } from './create-delivery-company.input';

@InputType()
export class UpdateDeliveryCompanyInput extends PartialType(
  CreateDeliveryCompanyInput,
) {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
