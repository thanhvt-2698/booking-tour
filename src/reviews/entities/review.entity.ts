import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { TourEntity } from '../../tours/entities/tour.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ReviewStatus } from '../constants/review.constants';

@Entity({ name: 'reviews' })
@Index('IDX_reviews_user_tour_unique', ['userId', 'tourId'], { unique: true })
@Index('IDX_reviews_tour_status_created', [
  'tourId',
  'status',
  'createdAt',
  'id',
])
@Check('CHK_reviews_rating_valid', '"rating" >= 1 AND "rating" <= 5')
export class ReviewEntity {
  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => BookingEntity, (booking) => booking.reviews, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_reviews_booking',
    name: 'booking_id',
    referencedColumnName: 'id',
  })
  booking!: BookingEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'text' })
  body!: string;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({
    default: ReviewStatus.PUBLISHED,
    enum: ReviewStatus,
    enumName: 'review_status_enum',
    type: 'enum',
  })
  status!: ReviewStatus;

  @Column({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @ManyToOne(() => TourEntity, (tour) => tour.reviews, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_reviews_tour',
    name: 'tour_id',
    referencedColumnName: 'id',
  })
  tour!: TourEntity;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.reviews, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_reviews_user',
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user!: UserEntity;
}
