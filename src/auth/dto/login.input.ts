import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from 'src/user/enums/user-role.enum';

@InputType()
export class LoginInput {
  @Field()
  @IsNotEmpty({
    message: 'Email or phone number is required',
  })
  @IsString()
  emailOrPhone: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  password: string;

  @Field(() => UserRole)
  @IsEnum(UserRole)
  role: UserRole;
}
