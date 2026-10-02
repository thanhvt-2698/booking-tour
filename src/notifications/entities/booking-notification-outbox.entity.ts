import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingStatus } from '../../bookings/constants/booking.constants';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import {
  BookingNotificationDeliveryStatus,
  BookingNotificationOutboxKind,
} from '../constants/notification.constants';

@Entity({ name: 'booking_notification_outbox' })
@Index(
  'UQ_booking_notification_outbox_deduplication_key',
  ['deduplicationKey'],
  { unique: true },
)
@Index('IDX_booking_notification_outbox_pending', [
  'processedAt',
  'lastCheckedAt',
  'createdAt',
  'id',
])
export class BookingNotificationOutboxEntity {
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({
    enum: BookingNotificationDeliveryStatus,
    enumName: 'booking_notification_delivery_status_enum',
    name: 'delivery_status',
    nullable: true,
    type: 'enum',
  })
  deliveryStatus!: BookingNotificationDeliveryStatus | null;

  @Column({ length: 255, name: 'deduplication_key', type: 'varchar' })
  deduplicationKey!: string;

  @Column({ name: 'dispatched_at', nullable: true, type: 'timestamptz' })
  dispatchedAt!: Date | null;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'last_checked_at', nullable: true, type: 'timestamptz' })
  lastCheckedAt!: Date | null;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => BookingEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_booking_notification_outbox_booking',
    name: 'booking_id',
    referencedColumnName: 'id',
  })
  booking!: BookingEntity;

  @Column({ name: 'processed_at', nullable: true, type: 'timestamptz' })
  processedAt!: Date | null;

  @Column({ name: 'reason', length: 500, nullable: true, type: 'varchar' })
  reason!: string | null;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId!: string;

  @Column({ name: 'start_at', nullable: true, type: 'timestamptz' })
  startAt!: Date | null;

  @Column({
    enum: BookingNotificationOutboxKind,
    enumName: 'booking_notification_outbox_kind_enum',
    type: 'enum',
  })
  kind!: BookingNotificationOutboxKind;

  @Column({
    enum: BookingStatus,
    enumName: 'booking_status_enum',
    nullable: true,
    type: 'enum',
  })
  status!: BookingStatus | null;
}
