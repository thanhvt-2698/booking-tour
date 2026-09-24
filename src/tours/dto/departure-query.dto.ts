import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DepartureStatus } from '../constants/departure.constants';

export class DepartureQueryDto extends PaginationDto {}

export class AdminDepartureQueryDto extends DepartureQueryDto {
  @ApiPropertyOptional({ enum: DepartureStatus })
  @IsOptional()
  @IsEnum(DepartureStatus)
  status?: DepartureStatus;
}
