import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationRecipientType } from '../../notification/enums/notification-recipient-type.enum';

/**
 * ClickUp 869fp1jmt: a browser that accepted FCM push. One row per FCM
 * token; signing in as someone else on the same browser moves the row.
 */
@Entity('push_devices')
@Index(['recipientId', 'recipientType'])
export class PushDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({ type: 'uuid' })
  recipientId: string;

  @Column({ type: 'enum', enum: NotificationRecipientType })
  recipientType: NotificationRecipientType;

  /** Site language when the device registered; pushes are sent in it. */
  @Column({ type: 'varchar', length: 2, default: 'ar' })
  language: 'ar' | 'en';

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
