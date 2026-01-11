import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail, IsArray } from 'class-validator';

@InputType()
export class SettingInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  aboutEn?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  aboutAr?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  privacyPolicyEn?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  privacyPolicyAr?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  termsEn?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  termsAr?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  phones?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @Field(() => [SocialMediaLinkInput], { nullable: true })
  @IsOptional()
  socialMediaLinks?: Array<{ name: string; link: string }>;
}

@InputType()
export class SocialMediaLinkInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  link: string;
}
