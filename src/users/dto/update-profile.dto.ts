import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length } from 'class-validator';
import {
  USER_BIO_MAX_LENGTH,
  USER_BIO_MIN_LENGTH,
} from '../constants/user.constants';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: USER_BIO_MAX_LENGTH, nullable: true })
  @IsOptional()
  @IsString()
  @Length(USER_BIO_MIN_LENGTH, USER_BIO_MAX_LENGTH)
  bio?: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    nullable: true,
    description: 'External avatar URL. Send null to clear the avatar.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string | null;
}
