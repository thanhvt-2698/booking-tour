import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MAX_PAGE_SIZE } from '../common/constants/app.constants';
import { ReviewListResponseDto } from './dto/review-list-response.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import type { ReviewList } from './interfaces/review-list.interface';
import { ReviewsService } from './reviews.service';

@Controller('tours')
@ApiTags('Reviews')
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':tourId/reviews')
  @ApiOperation({ summary: 'List published reviews for a tour' })
  @ApiParam({ format: 'uuid', name: 'tourId' })
  @ApiQuery({ example: 1, name: 'page', required: false, type: Number })
  @ApiQuery({
    example: 20,
    maximum: MAX_PAGE_SIZE,
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiOkResponse({ type: ReviewListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour ID or pagination' })
  @ApiNotFoundResponse({ description: 'Published tour does not exist' })
  findByTour(
    @Param('tourId', new ParseUUIDPipe({ version: '4' })) tourId: string,
    @Query() query: ReviewQueryDto,
  ): Promise<ReviewList> {
    return this.reviewsService.findPublicByTour(tourId, query);
  }
}
