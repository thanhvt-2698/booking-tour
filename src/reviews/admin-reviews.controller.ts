import {
  Body,
  Controller,
  Delete,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MAX_PAGE_SIZE } from '../common/constants/app.constants';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/constants/user.constants';
import { ReviewStatus } from './constants/review.constants';
import { AdminReviewListResponseDto } from './dto/admin-review-list-response.dto';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import type { AdminReviewList } from './interfaces/admin-review-list.interface';
import { ReviewsService } from './reviews.service';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Administration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
@ApiForbiddenResponse({ description: 'ADMIN role required' })
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({
    summary: 'List reviews for moderation with optional filters',
    description:
      'Returns image metadata for non-deleted reviews. ' +
      'Image downloads follow the existing published-review visibility policy; ' +
      'deleted reviews have no images.',
  })
  @ApiQuery({ example: 1, name: 'page', required: false, type: Number })
  @ApiQuery({
    example: 20,
    maximum: MAX_PAGE_SIZE,
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiQuery({
    description: 'Omit to include PUBLISHED, HIDDEN, and DELETED reviews.',
    enum: ReviewStatus,
    name: 'status',
    required: false,
  })
  @ApiQuery({ format: 'uuid', name: 'tourId', required: false })
  @ApiQuery({ format: 'uuid', name: 'userId', required: false })
  @ApiOkResponse({ type: AdminReviewListResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid review filters or pagination',
  })
  findMany(@Query() query: AdminReviewQueryDto): Promise<AdminReviewList> {
    return this.reviewsService.findForAdmin(query);
  }

  @Patch(':reviewId')
  @ApiOperation({ summary: 'Hide or publish a tour review' })
  @ApiParam({ format: 'uuid', name: 'reviewId' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid review ID or status' })
  @ApiNotFoundResponse({ description: 'Review does not exist' })
  moderate(
    @Param('reviewId', new ParseUUIDPipe({ version: '4' })) reviewId: string,
    @Body() input: ModerateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.moderate(reviewId, input);
  }

  @Delete(':reviewId')
  @ApiOperation({ summary: 'Delete a tour review' })
  @ApiParam({ format: 'uuid', name: 'reviewId' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid review ID' })
  @ApiNotFoundResponse({ description: 'Review does not exist' })
  remove(
    @Param('reviewId', new ParseUUIDPipe({ version: '4' })) reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.removeAsAdmin(reviewId);
  }
}
