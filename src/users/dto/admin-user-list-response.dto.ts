import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class AdminUserListResponseDto {
  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  @ApiProperty({ isArray: true, type: UserResponseDto })
  users!: UserResponseDto[];
}
