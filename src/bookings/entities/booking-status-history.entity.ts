import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { BookingStatus } from '../constants/booking.constants';
import { BookingEntity } from './booking.entity';

@Entity({ name: 'booking_status_histories' })
@Index('IDX_booking_status_histories_booking_created', [
  'bookingId',
  'createdAt',
])
export class BookingStatusHistoryEntity {
  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' })
  actorUserId!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.bookingStatusHistories, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_booking_status_histories_actor',
    name: 'actor_user_id',
    referencedColumnName: 'id',
  })
  actorUser!: UserEntity | null;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => BookingEntity, (booking) => booking.statusHistories, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_booking_status_histories_booking',
    name: 'booking_id',
    referencedColumnName: 'id',
  })
  booking!: BookingEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({
    enum: BookingStatus,
    enumName: 'booking_status_enum',
    name: 'from_status',
    nullable: true,
    type: 'enum',
  })
  fromStatus!: BookingStatus | null;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 500, nullable: true, type: 'varchar' })
  reason!: string | null;

  @Column({
    enum: BookingStatus,
    enumName: 'booking_status_enum',
    name: 'to_status',
    type: 'enum',
  })
  toStatus!: BookingStatus;
}
