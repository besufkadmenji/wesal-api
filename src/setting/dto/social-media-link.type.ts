import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

export enum SocialMediaPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  TWITTER = 'TWITTER',
  LINKEDIN = 'LINKEDIN',
  TIKTOK = 'TIKTOK',
}

registerEnumType(SocialMediaPlatform, {
  name: 'SocialMediaPlatform',
});

@ObjectType()
export class SocialMediaLink {
  @Field(() => SocialMediaPlatform)
  name: SocialMediaPlatform;

  @Field()
  link: string;
}
