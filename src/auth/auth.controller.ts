import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
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
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or blocked account',
  })
  async login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(input);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiOkResponse({ description: 'Refresh token revoked when it is active' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  async logout(@Body() input: RefreshTokenDto): Promise<void> {
    await this.authService.logout(input.refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({
    description: 'Invalid, revoked, expired, or blocked token',
  })
  async refresh(@Body() input: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(input.refreshToken);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a USER account and issue tokens' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Email or username is already in use' })
  async register(@Body() input: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(input);
  }
}
