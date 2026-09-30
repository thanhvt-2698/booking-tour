import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { UserEntity } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('tours')
@UseGuards(JwtAuthGuard)
@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':tourId/reviews')
  @ApiOperation({ summary: 'Submit a review for a completed tour' })
  @ApiParam({ format: 'uuid', name: 'tourId' })
  @ApiCreatedResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour ID or review data' })
  @ApiConflictResponse({
    description: 'The booking is not eligible or a review already exists',
  })
  @ApiNotFoundResponse({ description: 'Tour does not exist' })
  create(
    @CurrentUser() user: UserEntity,
    @Param('tourId', new ParseUUIDPipe({ version: '4' })) tourId: string,
    @Body() input: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.create(user.id, tourId, input);
  }

  @Patch(':tourId/reviews/:reviewId')
  @ApiOperation({ summary: 'Update one of your tour reviews' })
  @ApiParam({ format: 'uuid', name: 'tourId' })
  @ApiParam({ format: 'uuid', name: 'reviewId' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid review data or ID' })
  @ApiNotFoundResponse({ description: 'Review does not exist or is not yours' })
  update(
    @CurrentUser() user: UserEntity,
    @Param('tourId', new ParseUUIDPipe({ version: '4' })) tourId: string,
    @Param('reviewId', new ParseUUIDPipe({ version: '4' })) reviewId: string,
    @Body() input: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.updateOwn(user.id, tourId, reviewId, input);
  }

  @Delete(':tourId/reviews/:reviewId')
  @ApiOperation({ summary: 'Delete one of your tour reviews' })
  @ApiParam({ format: 'uuid', name: 'tourId' })
  @ApiParam({ format: 'uuid', name: 'reviewId' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour or review ID' })
  @ApiNotFoundResponse({ description: 'Review does not exist or is not yours' })
  remove(
    @CurrentUser() user: UserEntity,
    @Param('tourId', new ParseUUIDPipe({ version: '4' })) tourId: string,
    @Param('reviewId', new ParseUUIDPipe({ version: '4' })) reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.removeOwn(user.id, tourId, reviewId);
  }
}
