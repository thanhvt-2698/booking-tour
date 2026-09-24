import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ISO_DATE_PATTERN, TourStatus } from '../constants/tour.constants';

export class TourQueryDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 100, example: 'Đà Nẵng' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  keyword?: string;

  @ApiPropertyOptional({ enum: TourStatus })
  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;
}

export class PublicTourQueryDto extends TourQueryDto {
  @ApiPropertyOptional({
    description:
      'Inclusive start date; supply together with departureTo in YYYY-MM-DD format',
    example: '2030-07-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  @Matches(ISO_DATE_PATTERN)
  departureFrom?: string;

  @ApiPropertyOptional({
    description:
      'Inclusive end date; supply together with departureFrom in YYYY-MM-DD format',
    example: '2030-07-08',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  @Matches(ISO_DATE_PATTERN)
  departureTo?: string;
}
