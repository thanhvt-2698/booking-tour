import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserStatus } from '../constants/user.constants';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus, example: UserStatus.BLOCKED })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
