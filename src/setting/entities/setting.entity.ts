import { Field, ID, ObjectType } from '@nestjs/graphql';
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
  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  aboutEn: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  aboutAr: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  privacyPolicyEn: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  privacyPolicyAr: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  termsEn: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  termsAr: string;

  @Field(() => [String])
  @Column({ type: 'simple-array', nullable: true })
  phones: string[];

  @Field()
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Field()
  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsappNumber: string;

  @Field(() => [SocialMediaLink], { nullable: true })
  @Column({ type: 'jsonb', nullable: true, default: [] })
  socialMediaLinks: Array<{ name: string; link: string }>;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
