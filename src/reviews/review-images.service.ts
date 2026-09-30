import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFile } from 'node:fs/promises';
import type { Repository } from 'typeorm';
import { FileStorageService } from '../files/file-storage.service';
import { FILE_NOT_FOUND_CODE } from '../files/constants/file.constants';
import { TourStatus } from '../tours/constants/tour.constants';
import {
  REVIEW_IMAGE_DOWNLOAD_FIELDS,
  ReviewStatus,
} from './constants/review.constants';
import { ReviewImageEntity } from './entities/review-image.entity';

@Injectable()
export class ReviewImagesService {
  constructor(
    @InjectRepository(ReviewImageEntity)
    private readonly imagesRepository: Repository<ReviewImageEntity>,
    private readonly fileStorage: FileStorageService,
  ) {}

  async download(filename: string): Promise<StreamableFile> {
    const storageKey = `reviews/${filename}`;
    const path = this.fileStorage.getPath(storageKey);
    const image = await this.imagesRepository
      .createQueryBuilder('image')
      .innerJoin('image.review', 'review')
      .innerJoin('review.tour', 'tour')
      .select([...REVIEW_IMAGE_DOWNLOAD_FIELDS])
      .where('image.storageKey = :storageKey', { storageKey })
      .andWhere('review.status = :reviewStatus', {
        reviewStatus: ReviewStatus.PUBLISHED,
      })
      .andWhere('tour.status = :tourStatus', {
        tourStatus: TourStatus.PUBLISHED,
      })
      .getOne();

    if (!image) {
      throw new NotFoundException('errors.reviewImageNotFound');
    }

    try {
      return new StreamableFile(await readFile(path), {
        type: image.mimeType,
      });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === FILE_NOT_FOUND_CODE) {
        throw new NotFoundException('errors.reviewImageNotFound');
      }
      throw error;
    }
  }
}
