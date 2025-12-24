import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class CreateFavoriteInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  advertisementId: string;
}
