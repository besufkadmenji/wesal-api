import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class AssignPermissionInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  adminId: string;

  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  permissionId: string;
}