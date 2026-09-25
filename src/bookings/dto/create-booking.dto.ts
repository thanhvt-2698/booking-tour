import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { BOOKING_MAX_QUANTITY } from '../constants/booking.constants';

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  departureId!: string;

  @ApiProperty({ example: 2, maximum: BOOKING_MAX_QUANTITY, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Max(BOOKING_MAX_QUANTITY)
  @Min(1)
  quantity!: number;
}
