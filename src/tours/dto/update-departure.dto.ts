import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';
import {
  DepartureUpdateStatus,
  ISO_DATETIME_WITH_TIMEZONE_PATTERN,
} from '../constants/departure.constants';

export class UpdateDepartureDto {
  @ApiPropertyOptional({ example: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    example: '2030-07-05T17:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  @Matches(ISO_DATETIME_WITH_TIMEZONE_PATTERN)
  endAt?: string;

  @ApiPropertyOptional({
    example: '2030-07-04T23:59:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  @Matches(ISO_DATETIME_WITH_TIMEZONE_PATTERN)
  bookingDeadline?: string | null;

  @ApiPropertyOptional({ enum: DepartureUpdateStatus })
  @IsOptional()
  @IsEnum(DepartureUpdateStatus)
  status?: DepartureUpdateStatus;

  @ApiPropertyOptional({
    example: '2030-07-01T08:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  @Matches(ISO_DATETIME_WITH_TIMEZONE_PATTERN)
  startAt?: string;
}
