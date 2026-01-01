import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../user/entities/user.entity';
import { OtpType } from '../enums/otp-type.enum';

@ObjectType()
@Entity('otps')
export class Otp {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'uuid' })
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

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
