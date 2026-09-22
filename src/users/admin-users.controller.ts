import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from './constants/user.constants';
import { AdminUserListResponseDto } from './dto/admin-user-list-response.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Administration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Bearer token is missing, invalid, expired, or blocked',
})
@ApiForbiddenResponse({ description: 'ADMIN role required' })
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with optional role/status filters' })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  findUsers(@Query() query: AdminUserQueryDto) {
    return this.usersService.findForAdmin(query);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  async findUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findRequiredById(userId);
    return this.usersService.toResponse(user);
  }

  @Patch(':userId/role')
  @ApiOperation({ summary: 'Change a user role' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({
    description: 'The last active admin cannot be removed',
  })
  async updateRole(
    @CurrentUser() actor: UserEntity,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() input: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateRole(actor.id, userId, input);

    return this.usersService.toResponse(user);
  }

  @Patch(':userId/status')
  @ApiOperation({ summary: 'Block or activate a user account' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({
    description: 'The last active admin cannot be blocked',
  })
  async updateStatus(
    @CurrentUser() actor: UserEntity,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() input: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateStatus(actor.id, userId, input);

    return this.usersService.toResponse(user);
  }
}
