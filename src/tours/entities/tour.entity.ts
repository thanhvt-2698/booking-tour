import {
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
import { CategoryEntity } from '../../categories/entities/category.entity';
import { TourImageEntity } from '../../files/entities/tour-image.entity';
import { ReviewEntity } from '../../reviews/entities/review.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { TourStatus } from '../constants/tour.constants';
import { TourDepartureEntity } from './tour-departure.entity';

@Entity({ name: 'tours' })
@Index('IDX_tours_status_category', ['status', 'categoryId'])
@Index('IDX_tours_created_at_id', ['createdAt', 'id'])
export class TourEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_tours_category_id')
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => CategoryEntity, (category) => category.tours, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_tours_category',
    name: 'category_id',
    referencedColumnName: 'id',
  })
  category!: CategoryEntity;

  @Index('IDX_tours_created_by')
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => UserEntity, (user) => user.createdTours, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_tours_created_by',
    name: 'created_by',
    referencedColumnName: 'id',
  })
  createdByUser!: UserEntity;

  @Index('IDX_tours_code_unique', { unique: true })
  @Column({ length: 50, type: 'varchar' })
  code!: string;

  @Index('IDX_tours_slug_unique', { unique: true })
  @Column({ length: 180, type: 'varchar' })
  slug!: string;

  @Column({ length: 200, type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'base_price', precision: 12, scale: 2, type: 'numeric' })
  basePrice!: string;

  @Column({ default: 'VND', length: 3, type: 'char' })
  currency!: string;

  @Column({
    default: TourStatus.DRAFT,
    enum: TourStatus,
    enumName: 'tour_status_enum',
    type: 'enum',
  })
  status!: TourStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TourDepartureEntity, (departure) => departure.tour)
  departures!: TourDepartureEntity[];

  @OneToMany(() => TourImageEntity, (image) => image.tour)
  images!: TourImageEntity[];

  @OneToMany(() => ReviewEntity, (review) => review.tour)
  reviews!: ReviewEntity[];
}
