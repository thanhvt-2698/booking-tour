import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 500)
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
