import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Password12345!', minLength: 12, maxLength: 64 })
  @IsString()
  @Length(12, 64)
  password!: string;

  @ApiProperty({ example: 'traveler_01', minLength: 3, maxLength: 30 })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username!: string;
}
