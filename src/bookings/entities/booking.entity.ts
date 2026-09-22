import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TourDepartureEntity } from '../../tours/entities/tour-departure.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { BookingStatus } from '../constants/booking.constants';
import { BookingStatusHistoryEntity } from './booking-status-history.entity';
import { ReviewEntity } from '../../reviews/entities/review.entity';

@Entity({ name: 'bookings' })
@Index('IDX_bookings_user_created', ['userId', 'createdAt', 'id'])
@Index('IDX_bookings_status_created', ['status', 'createdAt', 'id'])
@Index('IDX_bookings_user_idempotency', ['userId', 'idempotencyKey'], {
  unique: true,
})
@Check('CHK_bookings_quantity_positive', '"quantity" > 0')
@Check(
  'CHK_bookings_prices_non_negative',
  '"unit_price" >= 0 AND "total_amount" >= 0',
)
export class BookingEntity {
  @Index('IDX_bookings_booking_code_unique', { unique: true })
  @Column({ length: 30, name: 'booking_code', type: 'varchar' })
  bookingCode!: string;

  @Column({ length: 3, type: 'char' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'departure_id', type: 'uuid' })
  departureId!: string;

  @ManyToOne(() => TourDepartureEntity, (departure) => departure.bookings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_bookings_departure',
    name: 'departure_id',
    referencedColumnName: 'id',
  })
  departure!: TourDepartureEntity;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    length: 100,
    name: 'idempotency_key',
    nullable: true,
    type: 'varchar',
  })
  idempotencyKey!: string | null;

  @Column({
    length: 500,
    name: 'cancel_reason',
    nullable: true,
    type: 'varchar',
  })
  cancelReason!: string | null;

  @Column({ precision: 12, scale: 2, name: 'total_amount', type: 'numeric' })
  totalAmount!: string;

  @Column({
    default: BookingStatus.PENDING,
    enum: BookingStatus,
    enumName: 'booking_status_enum',
    type: 'enum',
  })
  status!: BookingStatus;

  @Column({ precision: 12, scale: 2, name: 'unit_price', type: 'numeric' })
  unitPrice!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.bookings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_bookings_user',
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user!: UserEntity;

  @Column({ type: 'integer' })
  quantity!: number;

  @OneToMany(() => BookingStatusHistoryEntity, (history) => history.booking)
  statusHistories!: BookingStatusHistoryEntity[];

  @OneToMany(() => ReviewEntity, (review) => review.booking)
  reviews!: ReviewEntity[];
}
