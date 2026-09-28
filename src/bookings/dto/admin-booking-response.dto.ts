import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import { DepartureStatus } from '../../tours/constants/departure.constants';
import { BookingStatus } from '../constants/booking.constants';

export class AdminBookingUserResponseDto {
  @ApiProperty({
    example: 'eafae95f-37ea-413f-a9ec-5c2dc4bb92ea',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'traveler@example.com' })
  email!: string;
}

export class AdminBookingTourResponseDto {
  @ApiProperty({ example: 'HN-DN-001' })
  code!: string;

  @ApiProperty({
    example: 'eafae95f-37ea-413f-a9ec-5c2dc4bb92ea',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'Hanoi to Da Nang' })
  title!: string;
}

export class AdminBookingDepartureResponseDto {
  @ApiProperty({ example: 20 })
  capacity!: number;

  @ApiProperty({ example: 8 })
  bookedSeats!: number;

  @ApiProperty({ example: '2030-07-05T17:00:00.000Z' })
  endAt!: Date;

  @ApiProperty({
    example: 'eafae95f-37ea-413f-a9ec-5c2dc4bb92ea',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: '2030-07-01T08:00:00.000Z' })
  startAt!: Date;

  @ApiProperty({ enum: DepartureStatus })
  status!: DepartureStatus;

  @ApiProperty({ type: AdminBookingTourResponseDto })
  tour!: AdminBookingTourResponseDto;

  @ApiProperty({
    example: 'eafae95f-37ea-413f-a9ec-5c2dc4bb92ea',
    format: 'uuid',
  })
  tourId!: string;
}

export class AdminBookingResponseDto {
  @ApiProperty({ example: 'BT-45B5A857B0B047ABB0955F18' })
  bookingCode!: string;

  @ApiProperty({ nullable: true })
  cancelReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ type: AdminBookingDepartureResponseDto })
  departure!: AdminBookingDepartureResponseDto;

  @ApiProperty({
    example: 'eafae95f-37ea-413f-a9ec-5c2dc4bb92ea',
    format: 'uuid',
  })
  departureId!: string;

  @ApiProperty({
    example: 'eafae95f-37ea-413f-a9ec-5c2dc4bb92ea',
    format: 'uuid',
  })
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

  @ApiProperty({ type: AdminBookingUserResponseDto })
  user!: AdminBookingUserResponseDto;
}

class AdminBookingPaginationMetaDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class AdminBookingListResponseDto {
  @ApiProperty({ isArray: true, type: AdminBookingResponseDto })
  bookings!: AdminBookingResponseDto[];

  @ApiProperty({ type: AdminBookingPaginationMetaDto })
  meta!: PaginationMeta;
}
