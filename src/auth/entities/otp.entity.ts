import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Provider } from '../../provider/entities/provider.entity';
import { User } from '../../user/entities/user.entity';
import { OtpType } from '../enums/otp-type.enum';

@ObjectType()
@Entity('otps')
@Check(
  `("userId" IS NOT NULL AND "providerId" IS NULL) OR ("providerId" IS NOT NULL AND "userId" IS NULL)`,
)
export class Otp {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Field({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  providerId?: string;

  @Field(() => Provider, { nullable: true })
  @ManyToOne(() => Provider, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'providerId' })
  provider?: Provider;

  @Field(() => OtpType)
  @Column({
    type: 'enum',
    enum: OtpType,
  })
  type: OtpType;

  @Column({ type: 'varchar', length: 4 })
  code: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  target: string;

  @Field()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Field()
  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt?: Date;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
