import { BadRequestException, NotFoundException } from '@nestjs/common';
import { open, type FileHandle } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { Repository } from 'typeorm';
import type { FileStorageService } from '../files/file-storage.service';
import { TourStatus } from '../tours/constants/tour.constants';
import {
  REVIEW_IMAGE_DOWNLOAD_FIELDS,
  ReviewStatus,
} from './constants/review.constants';
import type { ReviewImageEntity } from './entities/review-image.entity';
import { ReviewImagesService } from './review-images.service';

jest.mock('node:fs/promises', () => ({ open: jest.fn() }));

describe('ReviewImagesService', () => {
  let service: ReviewImagesService;
  let getPath: jest.Mock;
  let createReadStream: jest.Mock;
  let fileStream: Readable;
  let query: Record<string, jest.Mock>;
  const filename = '3a1c36f9-8138-456f-b174-4cfcb0d0ea1e.png';

  beforeEach(() => {
    jest.clearAllMocks();
    query = {
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ mimeType: 'image/png' }),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    getPath = jest.fn().mockReturnValue('/uploads/reviews/photo.png');
    fileStream = Readable.from([]);
    createReadStream = jest.fn().mockReturnValue(fileStream);
    jest.mocked(open).mockResolvedValue({
      createReadStream,
    } as unknown as FileHandle);
    service = new ReviewImagesService(
      {
        createQueryBuilder: jest.fn().mockReturnValue(query),
      } as unknown as Repository<ReviewImageEntity>,
      { getPath } as unknown as FileStorageService,
    );
  });

  it('loads only public images of a published review and tour using bounded fields', async () => {
    const file = await service.download(filename);
    expect(file.getHeaders().type).toBe('image/png');
    expect(file.getStream()).toBe(fileStream);
    expect(getPath).toHaveBeenCalledWith(`reviews/${filename}`);
    expect(open).toHaveBeenCalledWith('/uploads/reviews/photo.png', 'r');
    expect(createReadStream).toHaveBeenCalledWith({ autoClose: true });
    expect(query.select).toHaveBeenCalledWith([
      ...REVIEW_IMAGE_DOWNLOAD_FIELDS,
    ]);
    expect(query.innerJoin).toHaveBeenCalledWith('image.review', 'review');
    expect(query.innerJoin).toHaveBeenCalledWith('review.tour', 'tour');
    expect(query.where).toHaveBeenCalledWith('image.storageKey = :storageKey', {
      storageKey: `reviews/${filename}`,
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      'review.status = :reviewStatus',
      { reviewStatus: ReviewStatus.PUBLISHED },
    );
    expect(query.andWhere).toHaveBeenCalledWith('tour.status = :tourStatus', {
      tourStatus: TourStatus.PUBLISHED,
    });
  });

  it('does not read files when the review image is hidden, deleted or missing', async () => {
    query.getOne.mockResolvedValue(null);
    await expect(service.download(filename)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(open).not.toHaveBeenCalled();
  });

  it('rejects malformed keys before querying the database', async () => {
    getPath.mockImplementation(() => {
      throw new BadRequestException('errors.imageKeyInvalid');
    });
    await expect(service.download('../secret')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(query.getOne).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('returns not found if image metadata exists but its file is missing', async () => {
    jest.mocked(open).mockRejectedValue({ code: 'ENOENT' });
    await expect(service.download(filename)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lets unexpected file errors reach the global exception handler', async () => {
    const error = Object.assign(new Error('Cannot read image'), {
      code: 'EACCES',
    });
    jest.mocked(open).mockRejectedValue(error);
    await expect(service.download(filename)).rejects.toBe(error);
  });
});
