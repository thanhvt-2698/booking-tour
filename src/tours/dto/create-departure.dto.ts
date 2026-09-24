import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { ISO_DATETIME_WITH_TIMEZONE_PATTERN } from '../constants/departure.constants';

export class CreateDepartureDto {
  @ApiProperty({ example: 20, minimum: 1 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty({
    example: '2030-07-05T17:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  @Matches(ISO_DATETIME_WITH_TIMEZONE_PATTERN)
  endAt!: string;

  @ApiPropertyOptional({
    example: '2030-07-04T23:59:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  @Matches(ISO_DATETIME_WITH_TIMEZONE_PATTERN)
  bookingDeadline?: string | null;

  @ApiProperty({
    example: '2030-07-01T08:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  @Matches(ISO_DATETIME_WITH_TIMEZONE_PATTERN)
  startAt!: string;
}
