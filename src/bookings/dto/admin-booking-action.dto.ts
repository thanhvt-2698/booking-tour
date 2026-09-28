import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { ADMIN_BOOKING_REASON_MAX_LENGTH } from '../constants/admin-booking.constants';

export class AdminBookingActionDto {
  @ApiPropertyOptional({
    example: 'The booking request has been reviewed',
    maxLength: ADMIN_BOOKING_REASON_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(1, ADMIN_BOOKING_REASON_MAX_LENGTH)
  reason?: string;
}
