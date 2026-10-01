import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  MAX_IMAGE_MIME_TYPE_LENGTH,
  MAX_IMAGE_ORIGINAL_NAME_LENGTH,
  MAX_IMAGE_PUBLIC_URL_LENGTH,
  MAX_IMAGE_STORAGE_KEY_LENGTH,
} from '../../files/constants/file.constants';
import { ReviewEntity } from './review.entity';

@Entity({ name: 'review_images' })
@Index('IDX_review_images_review_sort', ['reviewId', 'sortOrder', 'id'])
export class ReviewImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId!: string;

  @ManyToOne(() => ReviewEntity, (review) => review.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_review_images_review',
    name: 'review_id',
    referencedColumnName: 'id',
  })
  review!: ReviewEntity;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder!: number;

  @Index('IDX_review_images_storage_key_unique', { unique: true })
  @Column({
    name: 'storage_key',
    length: MAX_IMAGE_STORAGE_KEY_LENGTH,
    type: 'varchar',
  })
  storageKey!: string;

  @Column({ length: MAX_IMAGE_PUBLIC_URL_LENGTH, type: 'varchar' })
  url!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
