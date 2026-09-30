import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { DEFAULT_API_PREFIX } from '../common/constants/app.constants';
import {
  FILE_NOT_FOUND_CODE,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_ORIGINAL_NAME_LENGTH,
  TOUR_IMAGE_MIME_TYPES,
  UPLOAD_DIRECTORY_NAME,
  UPLOAD_URL_PREFIX,
} from './constants/file.constants';
import type { StoredImage } from './interfaces/stored-image.interface';
import type { UploadedImage } from './interfaces/uploaded-image.interface';

export type ImageFolder = 'avatars' | 'reviews' | 'tours';

const MANAGED_KEY_PATTERN =
  /^(avatars|reviews|tours)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$/;

export function getUploadRoot(): string {
  return resolve(process.cwd(), UPLOAD_DIRECTORY_NAME);
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  async store(
    files: readonly UploadedImage[],
    folder: ImageFolder,
    maxCount: number,
  ): Promise<StoredImage[]> {
    if (files.length > maxCount) {
      throw new BadRequestException('errors.imageCountExceeded');
    }

    const validated = files.map((file) => this.validate(file));
    const stored: StoredImage[] = [];
    const attemptedKeys: string[] = [];

    try {
      await mkdir(join(getUploadRoot(), folder), { recursive: true });

      for (const image of validated) {
        const storageKey = `${folder}/${randomUUID()}${image.extension}`;
        attemptedKeys.push(storageKey);
        await writeFile(join(getUploadRoot(), storageKey), image.file.buffer, {
          flag: 'wx',
        });
        stored.push({
          mimeType: image.file.mimetype,
          originalName: image.file.originalname,
          sizeBytes: image.file.size,
          storageKey,
          url:
            folder === 'reviews'
              ? `/${process.env.API_PREFIX ?? DEFAULT_API_PREFIX}/review-images/${storageKey.slice(folder.length + 1)}`
              : `${UPLOAD_URL_PREFIX}${storageKey}`,
        });
      }

      return stored;
    } catch (error: unknown) {
      await this.removeBestEffort(attemptedKeys);
      throw error;
    }
  }

  async remove(storageKeys: readonly string[]): Promise<void> {
    for (const storageKey of storageKeys) {
      try {
        await unlink(this.getPath(storageKey));
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== FILE_NOT_FOUND_CODE) {
          throw error;
        }
      }
    }
  }

  async removeBestEffort(storageKeys: readonly string[]): Promise<void> {
    for (const storageKey of storageKeys) {
      try {
        await this.remove([storageKey]);
      } catch (error: unknown) {
        this.logger.warn(
          JSON.stringify({
            event: 'image_cleanup_failed',
            errorName: error instanceof Error ? error.name : 'UnknownError',
          }),
        );
      }
    }
  }

  toKey(url: string): string | null {
    if (!url.startsWith(UPLOAD_URL_PREFIX)) {
      return null;
    }

    const key = url.slice(UPLOAD_URL_PREFIX.length);
    return MANAGED_KEY_PATTERN.test(key) ? key : null;
  }

  getPath(storageKey: string): string {
    if (!MANAGED_KEY_PATTERN.test(storageKey)) {
      throw new BadRequestException('errors.imageKeyInvalid');
    }

    return join(getUploadRoot(), storageKey);
  }

  private validate(file: UploadedImage): {
    extension: string;
    file: UploadedImage;
  } {
    if (
      !Buffer.isBuffer(file.buffer) ||
      file.size !== file.buffer.length ||
      file.size === 0 ||
      file.size > MAX_IMAGE_SIZE_BYTES
    ) {
      throw new BadRequestException('errors.imageInvalid');
    }

    if (
      !file.originalname ||
      file.originalname.length > MAX_IMAGE_ORIGINAL_NAME_LENGTH ||
      file.originalname.includes('/') ||
      file.originalname.includes('\\') ||
      file.originalname.includes('\0')
    ) {
      throw new BadRequestException('errors.imageInvalid');
    }

    const extension = extname(file.originalname).toLowerCase();
    const expectedMimeType =
      extension === '.jpg' || extension === '.jpeg'
        ? TOUR_IMAGE_MIME_TYPES.jpeg
        : extension === '.png'
          ? TOUR_IMAGE_MIME_TYPES.png
          : extension === '.webp'
            ? TOUR_IMAGE_MIME_TYPES.webp
            : null;

    if (
      !expectedMimeType ||
      file.mimetype !== expectedMimeType ||
      !this.matchesSignature(file.buffer, expectedMimeType)
    ) {
      throw new BadRequestException('errors.imageInvalid');
    }

    return { extension, file };
  }

  private matchesSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === TOUR_IMAGE_MIME_TYPES.jpeg) {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }
    if (mimeType === TOUR_IMAGE_MIME_TYPES.png) {
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      );
    }
    if (mimeType === TOUR_IMAGE_MIME_TYPES.webp) {
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    }

    return false;
  }
}
