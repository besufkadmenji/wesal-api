import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsUUID } from 'class-validator';
import { ActionType } from '../enums/action-type.enum';
import { TargetType } from '../enums/target-type.enum';

@InputType()
export class TrackActionInput {
  @Field(() => TargetType)
  @IsEnum(TargetType)
  targetType: TargetType;

  @Field(() => String)
  @IsUUID()
  targetId: string;

  @Field(() => ActionType)
  @IsEnum(ActionType)
  actionType: ActionType;
}
