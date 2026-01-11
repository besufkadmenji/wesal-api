import { Field, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SocialMediaLink } from '../dto/social-media-link.type';

@ObjectType()
@Entity('settings')
export class Setting {
  @PrimaryColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text', default: '' })
  aboutEn: string;

  @Field()
  @Column({ type: 'text', default: '' })
  aboutAr: string;

  @Field()
  @Column({ type: 'text', default: '' })
  privacyPolicyEn: string;

  @Field()
  @Column({ type: 'text', default: '' })
  privacyPolicyAr: string;

  @Field()
  @Column({ type: 'text', default: '' })
  termsEn: string;

  @Field()
  @Column({ type: 'text', default: '' })
  termsAr: string;

  @Field(() => [String])
  @Column({ type: 'simple-array', default: [] })
  phones: string[];

  @Field()
  @Column({ type: 'varchar', length: 255, default: '' })
  email: string;

  @Field()
  @Column({ type: 'varchar', length: 20, default: '' })
  whatsappNumber: string;

  @Field(() => [SocialMediaLink])
  @Column({ type: 'jsonb', default: [] })
  socialMediaLinks: Array<{ name: string; link: string }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
