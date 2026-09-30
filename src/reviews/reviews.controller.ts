import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
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
}
