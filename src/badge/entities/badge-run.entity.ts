import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@ObjectType()
export class BadgeRunProvider {
  @Field()
  id: string;

  @Field({ nullable: true })
  name?: string;
}

/** One row per monthly badge run; the unique period keeps the job idempotent. */
@ObjectType()
@Entity('badge_runs')
export class BadgeRun {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: 'Month the run belongs to (YYYY-MM, Asia/Riyadh)' })
  @Column({ type: 'varchar', length: 7, unique: true })
  period: string;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  ranAt: Date;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  trustCount: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  diligenceCount: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  underImprovementCount: number;

  @Field(() => Int, { description: 'Providers whose badge changed' })
  @Column({ type: 'int', default: 0 })
  changedCount: number;

  @Field(() => [BadgeRunProvider], {
    description: 'Under-improvement providers deleted by this run',
  })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  deletedProviders: BadgeRunProvider[];

  @Field(() => [BadgeRunProvider], {
    description:
      'Under-improvement providers not deleted because of unfinished contracts',
  })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  skippedProviders: BadgeRunProvider[];
}
