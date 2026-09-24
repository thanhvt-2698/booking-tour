import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import { DepartureStatus } from '../constants/departure.constants';

export class DepartureResponseDto {
  @ApiProperty({ example: 20 })
  capacity!: number;

  @ApiProperty({ example: 8 })
  bookedSeats!: number;

  @ApiProperty({ example: '2030-07-04T23:59:00.000Z', nullable: true })
  bookingDeadline!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ example: '2030-07-05T17:00:00.000Z' })
  endAt!: Date;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: DepartureStatus })
  status!: DepartureStatus;

  @ApiProperty({ example: '2030-07-01T08:00:00.000Z' })
  startAt!: Date;

  @ApiProperty({ format: 'uuid' })
  tourId!: string;

  @ApiProperty()
  updatedAt!: Date;
}

class DeparturePaginationMetaDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class DepartureListResponseDto {
  @ApiProperty({ isArray: true, type: DepartureResponseDto })
  departures!: DepartureResponseDto[];

  @ApiProperty({ type: DeparturePaginationMetaDto })
  meta!: PaginationMeta;
}
