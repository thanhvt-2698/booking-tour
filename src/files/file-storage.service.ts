import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileStorageConfig } from '../config/file-storage.config';
import {
  FILE_NOT_FOUND_CODE,
  FILE_STORAGE_ERROR_KEYS,
  FILE_STORAGE_LOG_EVENTS,
  FILE_WRITE_FLAG_NO_OVERWRITE,
  IMAGE_FILE_SIGNATURES,
  IMAGE_FILENAME_FORBIDDEN_CHARACTERS,
  IMAGE_MIME_TYPE_BY_EXTENSION,
  IMAGE_SIGNATURE_START_OFFSET,
  EXPECTED_IMAGE_STORAGE_KEY_SEGMENT_COUNT,
  IMAGE_STORAGE_KEY_SEPARATOR,
  MANAGED_IMAGE_NAME_PATTERN,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_ORIGINAL_NAME_LENGTH,
  MINIMUM_IMAGE_SIZE_BYTES,
  TOUR_IMAGE_MIME_TYPES,
  UPLOAD_DIRECTORY_NAME,
  UPLOAD_URL_PREFIX,
  UNKNOWN_ERROR_NAME,
  WEBP_FORMAT_SIGNATURE_OFFSET,
} from './constants/file.constants';
import type { StoredImage } from './interfaces/stored-image.interface';
import type { UploadedImage } from './interfaces/uploaded-image.interface';

export type ImageFolder = keyof typeof fileStorageConfig.folders;

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
    if (!Object.hasOwn(fileStorageConfig.folders, folder)) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.invalidImageKey);
    }
    if (files.length > maxCount) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.tooManyImages);
    }

    const validated = files.map((file) => this.validate(file));
    const stored: StoredImage[] = [];
    const attemptedKeys: string[] = [];

    try {
      await mkdir(join(getUploadRoot(), folder), { recursive: true });

      for (const image of validated) {
        const fileName = `${randomUUID()}${image.extension}`;
        const storageKey = [folder, fileName].join(IMAGE_STORAGE_KEY_SEPARATOR);
        attemptedKeys.push(storageKey);
        await writeFile(join(getUploadRoot(), storageKey), image.file.buffer, {
          flag: FILE_WRITE_FLAG_NO_OVERWRITE,
        });
        stored.push({
          mimeType: image.file.mimetype,
          originalName: image.file.originalname,
          sizeBytes: image.file.size,
          storageKey,
          url: `${fileStorageConfig.folders[folder].urlPrefix}${fileName}`,
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
            event: FILE_STORAGE_LOG_EVENTS.cleanupFailed,
            errorName: error instanceof Error ? error.name : UNKNOWN_ERROR_NAME,
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
    return this.isManagedKey(key) ? key : null;
  }

  getPath(storageKey: string): string {
    if (!this.isManagedKey(storageKey)) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.invalidImageKey);
    }

    return join(getUploadRoot(), storageKey);
  }

  private isManagedKey(storageKey: string): boolean {
    const segments = storageKey.split(IMAGE_STORAGE_KEY_SEPARATOR);
    return (
      segments.length === EXPECTED_IMAGE_STORAGE_KEY_SEGMENT_COUNT &&
      Object.hasOwn(fileStorageConfig.folders, segments[0]) &&
      MANAGED_IMAGE_NAME_PATTERN.test(segments[1])
    );
  }

  private validate(file: UploadedImage): {
    extension: string;
    file: UploadedImage;
  } {
    if (
      !Buffer.isBuffer(file.buffer) ||
      file.size !== file.buffer.length ||
      file.size < MINIMUM_IMAGE_SIZE_BYTES ||
      file.size > MAX_IMAGE_SIZE_BYTES
    ) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.invalidImage);
    }

    if (
      !file.originalname ||
      file.originalname.length > MAX_IMAGE_ORIGINAL_NAME_LENGTH ||
      IMAGE_FILENAME_FORBIDDEN_CHARACTERS.some((character) =>
        file.originalname.includes(character),
      )
    ) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.invalidImage);
    }

    const extension = extname(file.originalname).toLowerCase();
    const expectedMimeType = IMAGE_MIME_TYPE_BY_EXTENSION[extension] ?? null;

    if (
      !expectedMimeType ||
      file.mimetype !== expectedMimeType ||
      !this.matchesSignature(file.buffer, expectedMimeType)
    ) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.invalidImage);
    }

    return { extension, file };
  }

  private matchesSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === TOUR_IMAGE_MIME_TYPES.jpeg) {
      return this.startsWithSignature(buffer, IMAGE_FILE_SIGNATURES.jpeg);
    }
    if (mimeType === TOUR_IMAGE_MIME_TYPES.png) {
      return this.startsWithSignature(buffer, IMAGE_FILE_SIGNATURES.png);
    }
    if (mimeType === TOUR_IMAGE_MIME_TYPES.webp) {
      return (
        buffer.length >=
          WEBP_FORMAT_SIGNATURE_OFFSET +
            IMAGE_FILE_SIGNATURES.webpFormat.length &&
        buffer.toString(
          'ascii',
          IMAGE_SIGNATURE_START_OFFSET,
          IMAGE_FILE_SIGNATURES.webpRiff.length,
        ) === IMAGE_FILE_SIGNATURES.webpRiff &&
        buffer.toString(
          'ascii',
          WEBP_FORMAT_SIGNATURE_OFFSET,
          WEBP_FORMAT_SIGNATURE_OFFSET +
            IMAGE_FILE_SIGNATURES.webpFormat.length,
        ) === IMAGE_FILE_SIGNATURES.webpFormat
      );
    }

    return false;
  }

  private startsWithSignature(
    buffer: Buffer,
    signature: readonly number[],
  ): boolean {
    return (
      buffer.length >= signature.length &&
      buffer
        .subarray(
          IMAGE_SIGNATURE_START_OFFSET,
          IMAGE_SIGNATURE_START_OFFSET + signature.length,
        )
        .equals(Buffer.from(signature))
    );
  }
}
