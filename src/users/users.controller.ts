import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getCurrentUser(@CurrentUser() user: UserEntity): UserResponseDto {
    return this.usersService.toResponse(user);
  }

  @Patch('me')
  async updateCurrentUser(
    @CurrentUser() user: UserEntity,
    @Body() input: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.updateProfile(user.id, input);

    return this.usersService.toResponse(updatedUser);
  }
}
