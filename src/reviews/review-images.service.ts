import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFile } from 'node:fs/promises';
import type { Repository } from 'typeorm';
import { FileStorageService } from '../files/file-storage.service';
import {
  FILE_NOT_FOUND_CODE,
  IMAGE_STORAGE_KEY_SEPARATOR,
} from '../files/constants/file.constants';
import { TourStatus } from '../tours/constants/tour.constants';
import {
  REVIEW_IMAGE_DOWNLOAD_FIELDS,
  REVIEW_IMAGE_ERROR_KEYS,
  REVIEW_IMAGE_FOLDER_NAME,
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
    const storageKey = [REVIEW_IMAGE_FOLDER_NAME, filename].join(
      IMAGE_STORAGE_KEY_SEPARATOR,
    );
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
      throw new NotFoundException(REVIEW_IMAGE_ERROR_KEYS.notFound);
    }

    try {
      return new StreamableFile(await readFile(path), {
        type: image.mimeType,
      });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === FILE_NOT_FOUND_CODE) {
        throw new NotFoundException(REVIEW_IMAGE_ERROR_KEYS.notFound);
      }
      throw error;
    }
  }
}
