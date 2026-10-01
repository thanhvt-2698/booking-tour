import {
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  IMAGE_UPLOAD_REQUEST_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '../files/constants/file.constants';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import {
  MAX_AVATAR_IMAGE_COUNT,
  USER_BIO_MAX_LENGTH,
  USER_AVATAR_UPLOAD_FIELD_NAME,
} from './constants/user.constants';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Bearer token is missing, invalid, expired, or blocked',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  getCurrentUser(@CurrentUser() user: UserEntity): Promise<UserResponseDto> {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiConsumes(...IMAGE_UPLOAD_REQUEST_CONTENT_TYPES)
  @ApiBody({
    schema: {
      properties: {
        [USER_AVATAR_UPLOAD_FIELD_NAME]: { format: 'binary', type: 'string' },
        avatarUrl: { format: 'uri', type: 'string', nullable: true },
        bio: {
          maxLength: USER_BIO_MAX_LENGTH,
          type: 'string',
          nullable: true,
        },
      },
      type: 'object',
    },
  })
  @ApiOkResponse({ type: UserResponseDto })
  @UseInterceptors(
    FileInterceptor(USER_AVATAR_UPLOAD_FIELD_NAME, {
      limits: {
        fileSize: MAX_IMAGE_SIZE_BYTES,
        files: MAX_AVATAR_IMAGE_COUNT,
      },
    }),
  )
  updateCurrentUser(
    @CurrentUser() user: UserEntity,
    @Body() input: UpdateProfileDto,
    @UploadedFile() avatar?: UploadedImage,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfileResponse(user.id, input, avatar);
  }
}
