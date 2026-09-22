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
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { DepartureStatus } from '../constants/departure.constants';
import { TourEntity } from './tour.entity';

@Entity({ name: 'tour_departures' })
@Index('IDX_tour_departures_status_start_end', ['status', 'startAt', 'endAt'])
@Index('IDX_tour_departures_tour_start', ['tourId', 'startAt'])
@Check('CHK_tour_departures_capacity_positive', '"capacity" > 0')
@Check(
  'CHK_tour_departures_booked_seats_valid',
  '"booked_seats" >= 0 AND "booked_seats" <= "capacity"',
)
@Check(
  'CHK_tour_departures_dates_valid',
  '"end_at" > "start_at" AND ("booking_deadline" IS NULL OR "booking_deadline" <= "start_at")',
)
export class TourDepartureEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_deadline', nullable: true, type: 'timestamptz' })
  bookingDeadline!: Date | null;

  @Column({ type: 'integer' })
  capacity!: number;

  @Column({ name: 'booked_seats', default: 0, type: 'integer' })
  bookedSeats!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt!: Date;

  @Index('IDX_tour_departures_tour_id')
  @Column({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @ManyToOne(() => TourEntity, (tour) => tour.departures, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_tour_departures_tour',
    name: 'tour_id',
    referencedColumnName: 'id',
  })
  tour!: TourEntity;

  @Column({
    default: DepartureStatus.OPEN,
    enum: DepartureStatus,
    enumName: 'departure_status_enum',
    type: 'enum',
  })
  status!: DepartureStatus;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => BookingEntity, (booking) => booking.departure)
  bookings!: BookingEntity[];
}
