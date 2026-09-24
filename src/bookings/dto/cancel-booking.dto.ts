import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({
    example: 'Không thể tham gia theo lịch đã chọn',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}
