import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { UserEntity } from '../users/entities/user.entity';
import { BookingsService } from './bookings.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import {
  BookingListResponseDto,
  BookingResponseDto,
} from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import type { BookingList } from './interfaces/booking-list.interface';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiTags('Bookings')
@ApiBearerAuth('access-token')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking for the authenticated user' })
  @ApiHeader({
    description: 'Unique key used to safely retry the same booking request',
    name: 'Idempotency-Key',
    required: true,
  })
  @ApiCreatedResponse({ type: BookingResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid booking request' })
  @ApiConflictResponse({
    description: 'Departure is unavailable or idempotency key conflicts',
  })
  @ApiNotFoundResponse({
    description: 'Departure or published tour does not exist',
  })
  create(
    @CurrentUser() user: UserEntity,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() input: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.create(user.id, idempotencyKey, input);
  }

  @Get('me')
  @ApiOperation({ summary: 'List bookings of the authenticated user' })
  @ApiOkResponse({ type: BookingListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination or status filter' })
  findMine(
    @CurrentUser() user: UserEntity,
    @Query() query: BookingQueryDto,
  ): Promise<BookingList> {
    return this.bookingsService.findMine(user.id, query);
  }

  @Get(':bookingId')
  @ApiOperation({ summary: 'Get one booking of the authenticated user' })
  @ApiParam({ format: 'uuid', name: 'bookingId' })
  @ApiOkResponse({ type: BookingResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid booking ID' })
  @ApiNotFoundResponse({ description: 'Booking does not exist' })
  findMineById(
    @CurrentUser() user: UserEntity,
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.findMineById(user.id, bookingId);
  }

  @Patch(':bookingId/cancel')
  @ApiOperation({
    summary: 'Cancel a pending booking of the authenticated user',
  })
  @ApiParam({ format: 'uuid', name: 'bookingId' })
  @ApiOkResponse({ type: BookingResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid booking ID or cancellation reason',
  })
  @ApiConflictResponse({ description: 'Booking cannot be cancelled' })
  @ApiNotFoundResponse({ description: 'Booking does not exist' })
  cancel(
    @CurrentUser() user: UserEntity,
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Body() input: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.cancel(user.id, bookingId, input);
  }
}
