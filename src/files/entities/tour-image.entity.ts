import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TourEntity } from '../../tours/entities/tour.entity';
import { FIRST_TOUR_IMAGE_SORT_ORDER } from '../../tours/constants/tour.constants';
import {
  MAX_IMAGE_MIME_TYPE_LENGTH,
  MAX_IMAGE_ORIGINAL_NAME_LENGTH,
  MAX_IMAGE_PUBLIC_URL_LENGTH,
  MAX_IMAGE_STORAGE_KEY_LENGTH,
} from '../constants/file.constants';

@Entity({ name: 'tour_images' })
@Index('IDX_tour_images_tour_sort', ['tourId', 'sortOrder', 'createdAt'])
export class TourImageEntity {
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({
    name: 'mime_type',
    length: MAX_IMAGE_MIME_TYPE_LENGTH,
    type: 'varchar',
  })
  mimeType!: string;

  @Column({
    name: 'original_name',
    length: MAX_IMAGE_ORIGINAL_NAME_LENGTH,
    type: 'varchar',
  })
  originalName!: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes!: number;

  @Column({
    name: 'sort_order',
    default: FIRST_TOUR_IMAGE_SORT_ORDER,
    type: 'integer',
  })
  sortOrder!: number;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_tour_images_storage_key_unique', { unique: true })
  @Column({
    name: 'storage_key',
    length: MAX_IMAGE_STORAGE_KEY_LENGTH,
    type: 'varchar',
  })
  storageKey!: string;

  @Column({ length: MAX_IMAGE_PUBLIC_URL_LENGTH, type: 'varchar' })
  url!: string;

  @Index('IDX_tour_images_tour_id')
  @Column({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @ManyToOne(() => TourEntity, (tour) => tour.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_tour_images_tour',
    name: 'tour_id',
    referencedColumnName: 'id',
  })
  tour!: TourEntity;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
