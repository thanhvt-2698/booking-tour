import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password12345!', minLength: 12, maxLength: 64 })
  @IsString()
  @Length(12, 64)
  password!: string;
}
