import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../constants/user.constants';

export class UserResponseDto {
  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  username!: string;
}
