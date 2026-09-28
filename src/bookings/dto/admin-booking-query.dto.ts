import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ADMIN_BOOKING_DATE_PATTERN } from '../constants/admin-booking.constants';
import { BookingStatus } from '../constants/booking.constants';

export class AdminBookingQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Inclusive booking creation start date in YYYY-MM-DD format',
    example: '2030-07-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  @Matches(ADMIN_BOOKING_DATE_PATTERN)
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Inclusive booking creation end date in YYYY-MM-DD format',
    example: '2030-07-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  @Matches(ADMIN_BOOKING_DATE_PATTERN)
  createdTo?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departureId?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tourId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
