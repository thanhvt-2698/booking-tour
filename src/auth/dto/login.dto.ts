import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../constants/auth.constants';
import { USER_EMAIL_MAX_LENGTH } from '../../users/constants/user.constants';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    maxLength: USER_EMAIL_MAX_LENGTH,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password12345!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password!: string;
}
