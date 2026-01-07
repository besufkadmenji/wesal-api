import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsArray, ArrayMinSize } from 'class-validator';

@InputType()
export class BulkAssignPermissionsInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  adminId: string;

  @Field(() => [ID])
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  permissionIds: string[];
}
