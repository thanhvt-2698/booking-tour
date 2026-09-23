import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RefreshTokenEntity } from '../../auth/entities/refresh-token.entity';
import { SocialAccountEntity } from '../../auth/entities/social-account.entity';
import { BookingStatusHistoryEntity } from '../../bookings/entities/booking-status-history.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { ReviewEntity } from '../../reviews/entities/review.entity';
import { TourEntity } from '../../tours/entities/tour.entity';
import { UserRole, UserStatus } from '../constants/user.constants';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_users_email_unique', { unique: true })
  @Column({ length: 254, type: 'varchar' })
  email!: string;

  @Column({
    length: 255,
    name: 'password_hash',
    nullable: true,
    select: false,
    type: 'varchar',
  })
  passwordHash!: string | null;

  @Column({
    default: UserRole.USER,
    enum: UserRole,
    enumName: 'user_role_enum',
    type: 'enum',
  })
  role!: UserRole;

  @Column({
    default: UserStatus.ACTIVE,
    enum: UserStatus,
    enumName: 'user_status_enum',
    type: 'enum',
  })
  status!: UserStatus;

  @Column({ nullable: true, type: 'text' })
  bio!: string | null;

  @Column({ length: 2048, name: 'avatar_url', nullable: true, type: 'varchar' })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user)
  refreshTokens!: RefreshTokenEntity[];

  @OneToMany(() => SocialAccountEntity, (socialAccount) => socialAccount.user)
  socialAccounts!: SocialAccountEntity[];

  @OneToMany(() => TourEntity, (tour) => tour.createdByUser)
  createdTours!: TourEntity[];

  @OneToMany(() => BookingEntity, (booking) => booking.user)
  bookings!: BookingEntity[];

  @OneToMany(
    () => BookingStatusHistoryEntity,
    (bookingStatusHistory) => bookingStatusHistory.actorUser,
  )
  bookingStatusHistories!: BookingStatusHistoryEntity[];

  @OneToMany(() => ReviewEntity, (review) => review.user)
  reviews!: ReviewEntity[];
}
