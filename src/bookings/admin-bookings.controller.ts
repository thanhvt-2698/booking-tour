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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { UserRole } from '../users/constants/user.constants';
import type { UserEntity } from '../users/entities/user.entity';
import { AdminBookingsService } from './admin-bookings.service';
import { AdminBookingActionDto } from './dto/admin-booking-action.dto';
import { AdminBookingQueryDto } from './dto/admin-booking-query.dto';
import {
  AdminBookingListResponseDto,
  AdminBookingResponseDto,
} from './dto/admin-booking-response.dto';
import type { AdminBookingList } from './interfaces/admin-booking-list.interface';

@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Administration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Bearer token is missing, invalid, expired, or blocked',
})
@ApiForbiddenResponse({ description: 'ADMIN role required' })
export class AdminBookingsController {
  constructor(private readonly adminBookingsService: AdminBookingsService) {}

  @Patch(':bookingId/approve')
  @ApiOperation({ summary: 'Approve a pending booking' })
  @ApiParam({ format: 'uuid', name: 'bookingId' })
  @ApiOkResponse({ type: AdminBookingResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid booking ID or action reason' })
  @ApiConflictResponse({ description: 'Booking cannot be approved' })
  @ApiNotFoundResponse({ description: 'Booking does not exist' })
  approve(
    @CurrentUser() actor: UserEntity,
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Body() input: AdminBookingActionDto,
  ): Promise<AdminBookingResponseDto> {
    return this.adminBookingsService.approve(actor.id, bookingId, input);
  }

  @Get(':bookingId')
  @ApiOperation({ summary: 'Get a booking for administration' })
  @ApiParam({ format: 'uuid', name: 'bookingId' })
  @ApiOkResponse({ type: AdminBookingResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid booking ID' })
  @ApiNotFoundResponse({ description: 'Booking does not exist' })
  findById(
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
  ): Promise<AdminBookingResponseDto> {
    return this.adminBookingsService.findById(bookingId);
  }

  @Get()
  @ApiOperation({ summary: 'List bookings for administration' })
  @ApiOkResponse({ type: AdminBookingListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination or filter' })
  findMany(@Query() query: AdminBookingQueryDto): Promise<AdminBookingList> {
    return this.adminBookingsService.findMany(query);
  }

  @Patch(':bookingId/reject')
  @ApiOperation({ summary: 'Reject a pending booking' })
  @ApiParam({ format: 'uuid', name: 'bookingId' })
  @ApiOkResponse({ type: AdminBookingResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid booking ID or action reason' })
  @ApiConflictResponse({ description: 'Booking cannot be rejected' })
  @ApiNotFoundResponse({ description: 'Booking does not exist' })
  reject(
    @CurrentUser() actor: UserEntity,
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Body() input: AdminBookingActionDto,
  ): Promise<AdminBookingResponseDto> {
    return this.adminBookingsService.reject(actor.id, bookingId, input);
  }
}
