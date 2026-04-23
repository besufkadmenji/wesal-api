import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { SocialMediaPlatform } from './social-media-link.type';

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
  @IsEmail({ allow_utf8_local_part: false, require_tld: true })
  @Matches(/^[\x00-\x7F]+$/, {
    message: 'email must contain only ASCII characters',
  })
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @Field(() => [SocialMediaLinkInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialMediaLinkInput)
  socialMediaLinks?: SocialMediaLinkInput[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  rulesAr?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  rulesEn?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  platformManagerName?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  platformManagerSignature?: string | null;
}

@InputType()
export class SocialMediaLinkInput {
  @Field(() => SocialMediaPlatform)
  @IsEnum(SocialMediaPlatform)
  name: SocialMediaPlatform;

  @Field()
  @IsString()
  link: string;
}
