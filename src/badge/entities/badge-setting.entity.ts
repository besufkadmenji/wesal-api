import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { BadgeBound } from '../enums/badge-bound.enum';
import { BadgeTier } from '../enums/badge-tier.enum';

@ObjectType()
@Entity('badge_settings')
export class BadgeSetting {
  @Field(() => BadgeTier)
  @PrimaryColumn({ type: 'enum', enum: BadgeTier })
  tier: BadgeTier;

  @Field(() => BadgeBound, { nullable: true })
  @Column({ type: 'enum', enum: BadgeBound, nullable: true })
  maxBound: BadgeBound | null;

  @Field(() => BadgeBound, { nullable: true })
  @Column({ type: 'enum', enum: BadgeBound, nullable: true })
  minBound: BadgeBound | null;

  @Field()
  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
