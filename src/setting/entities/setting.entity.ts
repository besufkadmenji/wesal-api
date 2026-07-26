import { Field, Float, ObjectType, Int } from '@nestjs/graphql';
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

  @Field(() => Int, { nullable: true })
  @Column({
    type: 'bigint',
    unique: true,
    nullable: true,
    default: () => "nextval('public_id_seq')",
  })
  publicId: number | null;

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
  @Column({ type: 'simple-array', default: '' })
  phones: string[];

  @Field()
  @Column({ type: 'varchar', length: 255, default: '' })
  email: string;

  @Field()
  @Column({ type: 'varchar', length: 20, default: '' })
  whatsappNumber: string;

  @Field(() => [SocialMediaLink])
  @Column({ type: 'jsonb', default: [] })
  socialMediaLinks: SocialMediaLink[];

  @Field()
  @Column({ type: 'text', default: '' })
  rulesAr: string;

  @Field()
  @Column({ type: 'text', default: '' })
  rulesEn: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  platformManagerName: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  platformManagerSignature: string | null;

  // Global VAT rate (country-rule based), as a percentage e.g. 15.00 = 15%.
  // Applied in contract price calculations; per-section fees live on Category.
  @Field(() => Float)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatRate: number;

  @Field()
  @Column({ type: 'boolean', default: false })
  vatEnabled: boolean;

  @Field()
  @Column({ type: 'boolean', default: false })
  contractAcceptanceWindowEnabled: boolean;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  contractAcceptanceWindowDays: number;

  @Field()
  @Column({ type: 'boolean', default: false })
  premiumAdEnabled: boolean;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  premiumAdFee: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 30 })
  premiumAdDurationDays: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 24 })
  completionConfirmationGraceHours: number;
}
