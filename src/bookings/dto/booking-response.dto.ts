import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import { BookingStatus } from '../constants/booking.constants';

export class BookingResponseDto {
  @ApiProperty({ example: 'BT-45B5A857B0B047ABB0955F18' })
  bookingCode!: string;

  @ApiProperty({ nullable: true })
  cancelReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ format: 'uuid' })
  departureId!: string;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ example: '3000000.00' })
  totalAmount!: string;

  @ApiProperty({ example: '1500000.00' })
  unitPrice!: string;

  @ApiProperty()
  updatedAt!: Date;
}

class BookingPaginationMetaDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class BookingListResponseDto {
  @ApiProperty({ isArray: true, type: BookingResponseDto })
  bookings!: BookingResponseDto[];

  @ApiProperty({ type: BookingPaginationMetaDto })
  meta!: PaginationMeta;
}
