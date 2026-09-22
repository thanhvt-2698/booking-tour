import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  it('transforms valid query values and calculates offset', async () => {
    const pagination = plainToInstance(PaginationDto, {
      limit: '10',
      page: '3',
    });

    expect(await validate(pagination)).toHaveLength(0);
    expect(pagination.offset).toBe(20);
  });

  it('rejects invalid page boundaries', async () => {
    const pagination = plainToInstance(PaginationDto, {
      limit: '101',
      page: '0',
    });

    expect(await validate(pagination)).not.toHaveLength(0);
  });
});
