import { BadRequestException, Logger } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { MAX_IMAGE_SIZE_BYTES } from './constants/file.constants';
import { FileStorageService } from './file-storage.service';
import { getUploadRoot } from './file-storage.util';
import type { UploadedImage } from './interfaces/uploaded-image.interface';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

describe('FileStorageService', () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEtAAAAAASUVORK5CYII=',
    'base64',
  );
  const image: UploadedImage = {
    buffer: png,
    mimetype: 'image/png',
    originalname: 'photo.png',
    size: png.length,
  };
  let service: FileStorageService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(mkdir).mockResolvedValue(undefined);
    jest.mocked(writeFile).mockResolvedValue(undefined);
    jest.mocked(unlink).mockResolvedValue(undefined);
    service = new FileStorageService();
  });

  afterEach(() => jest.restoreAllMocks());

  it('writes a validated image under a random managed key without overwriting', async () => {
    const [stored] = await service.store([image], 'tours', 1);

    expect(stored).toEqual({
      mimeType: 'image/png',
      originalName: 'photo.png',
      sizeBytes: png.length,
      storageKey: expect.stringMatching(/^tours\/[a-f0-9-]+\.png$/) as unknown,
      url: expect.stringMatching(
        /^\/uploads\/tours\/[a-f0-9-]+\.png$/,
      ) as unknown,
    });
    expect(writeFile).toHaveBeenCalledWith(
      service.getPath(stored.storageKey),
      png,
      { flag: 'wx' },
    );
    expect(service.getPath(stored.storageKey)).toContain(getUploadRoot());
  });

  it('rejects the complete batch before writing if any image is invalid', async () => {
    await expect(
      service.store(
        [image, { ...image, buffer: Buffer.from('not an image'), size: 12 }],
        'tours',
        10,
      ),
    ).rejects.toThrow('errors.imageInvalid');
    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('uses the configured protected URL for review images', async () => {
    const [stored] = await service.store([image], 'reviews', 3);
    expect(stored.url).toBe(
      `/${process.env.API_PREFIX ?? 'api'}/review-images/${stored.storageKey.slice('reviews/'.length)}`,
    );
  });

  it.each([
    { ...image, buffer: Buffer.alloc(0), size: 0 },
    { ...image, size: image.size + 1 },
    {
      ...image,
      buffer: Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1),
      size: MAX_IMAGE_SIZE_BYTES + 1,
    },
    { ...image, mimetype: 'image/jpeg' },
    { ...image, originalname: 'photo.svg' },
    { ...image, originalname: '../photo.png' },
    { ...image, originalname: 'folder\\photo.png' },
    { ...image, originalname: 'photo\0.png' },
  ])('rejects an invalid upload without disk writes', async (invalid) => {
    await expect(service.store([invalid], 'tours', 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('enforces the count limit before writing', async () => {
    await expect(service.store([image, image], 'tours', 1)).rejects.toThrow(
      'errors.imageCountExceeded',
    );
    expect(mkdir).not.toHaveBeenCalled();
  });

  it('cleans successful and partially written files after a write failure', async () => {
    const failure = new Error('disk unavailable');
    jest
      .mocked(writeFile)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(failure);

    await expect(service.store([image, image], 'tours', 10)).rejects.toBe(
      failure,
    );
    expect(unlink).toHaveBeenCalledTimes(2);
    for (const [writtenPath] of jest.mocked(writeFile).mock.calls) {
      expect(unlink).toHaveBeenCalledWith(writtenPath);
    }
  });

  it('rejects traversal and unmanaged URLs when resolving managed files', () => {
    expect(() =>
      service.getPath('unregistered/00000000-0000-0000-0000-000000000001.png'),
    ).toThrow('errors.imageKeyInvalid');
    expect(() => service.getPath('tours/../../.env')).toThrow(
      'errors.imageKeyInvalid',
    );
    expect(service.toKey('https://example.com/avatar.png')).toBeNull();
    expect(service.toKey('/uploads/tours/../../.env')).toBeNull();
    expect(
      service.toKey('/uploads/tours/00000000-0000-0000-0000-000000000001.png'),
    ).toBe('tours/00000000-0000-0000-0000-000000000001.png');
  });

  it('ignores already removed files but propagates other removal failures', async () => {
    const key = 'tours/00000000-0000-0000-0000-000000000001.png';
    jest.mocked(unlink).mockRejectedValueOnce({ code: 'ENOENT' });
    await expect(service.remove([key])).resolves.toBeUndefined();
    jest.mocked(unlink).mockRejectedValueOnce({ code: 'EACCES' });
    await expect(service.remove([key])).rejects.toEqual({ code: 'EACCES' });
  });

  it('continues cleanup and logs safe context when one removal fails', async () => {
    const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const first = 'tours/00000000-0000-0000-0000-000000000001.png';
    const second = 'tours/00000000-0000-0000-0000-000000000002.png';
    jest
      .mocked(unlink)
      .mockRejectedValueOnce(new Error('sensitive file path'))
      .mockResolvedValueOnce(undefined);

    await expect(
      service.removeBestEffort([first, second]),
    ).resolves.toBeUndefined();
    expect(unlink).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledWith(
      JSON.stringify({ event: 'image_cleanup_failed', errorName: 'Error' }),
    );
    expect(JSON.stringify(warning.mock.calls)).not.toContain(
      'sensitive file path',
    );
  });
});
