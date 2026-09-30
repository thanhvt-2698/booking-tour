import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DEFAULT_RATE_LIMIT_WINDOW_MS } from '../common/constants/app.constants';
import {
  CACHE_CONTROL_HEADER,
  CACHE_CONTROL_NO_STORE_VALUE,
  EXPIRES_HEADER,
  EXPIRES_IMMEDIATELY_VALUE,
  PRAGMA_HEADER,
  PRAGMA_NO_CACHE_VALUE,
} from '../common/constants/security.constants';
import {
  IMAGE_UPLOAD_REQUEST_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '../files/constants/file.constants';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import {
  MAX_AVATAR_IMAGE_COUNT,
  USER_AVATAR_UPLOAD_FIELD_NAME,
} from '../users/constants/user.constants';
import { AuthService } from './auth.service';
import {
  LOGIN_RATE_LIMIT,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './constants/auth.constants';
import { USER_EMAIL_MAX_LENGTH } from '../users/constants/user.constants';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Throttle({
    default: { limit: LOGIN_RATE_LIMIT, ttl: DEFAULT_RATE_LIMIT_WINDOW_MS },
  })
  @Header(CACHE_CONTROL_HEADER, CACHE_CONTROL_NO_STORE_VALUE)
  @Header(PRAGMA_HEADER, PRAGMA_NO_CACHE_VALUE)
  @Header(EXPIRES_HEADER, EXPIRES_IMMEDIATELY_VALUE)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or blocked account',
  })
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(input);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiOkResponse({ description: 'Refresh token revoked when it is active' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  logout(@Body() input: RefreshTokenDto): Promise<void> {
    return this.authService.logout(input.refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Rotate a refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({
    description: 'Invalid, revoked, expired, or blocked token',
  })
  refresh(@Body() input: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(input.refreshToken);
  }

  @Post('register')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Register a USER account and issue tokens' })
  @ApiConsumes(...IMAGE_UPLOAD_REQUEST_CONTENT_TYPES)
  @ApiBody({
    schema: {
      properties: {
        [USER_AVATAR_UPLOAD_FIELD_NAME]: { format: 'binary', type: 'string' },
        email: {
          format: 'email',
          maxLength: USER_EMAIL_MAX_LENGTH,
          type: 'string',
        },
        password: {
          maxLength: PASSWORD_MAX_LENGTH,
          minLength: PASSWORD_MIN_LENGTH,
          type: 'string',
        },
      },
      required: ['email', 'password'],
      type: 'object',
    },
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Email is already in use' })
  @UseInterceptors(
    FileInterceptor(USER_AVATAR_UPLOAD_FIELD_NAME, {
      limits: {
        fileSize: MAX_IMAGE_SIZE_BYTES,
        files: MAX_AVATAR_IMAGE_COUNT,
      },
    }),
  )
  register(
    @Body() input: RegisterDto,
    @UploadedFile() avatar?: UploadedImage,
  ): Promise<AuthResponseDto> {
    return this.authService.register(input, avatar);
  }
}
