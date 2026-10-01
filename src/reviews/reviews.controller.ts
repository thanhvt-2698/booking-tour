import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UUID_VERSION_4 } from '../common/constants/validation.constants';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  IMAGE_UPLOAD_FIELD_NAME,
  IMAGE_UPLOAD_REQUEST_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '../files/constants/file.constants';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import type { UserEntity } from '../users/entities/user.entity';
import {
  MAX_REVIEW_IMAGE_COUNT,
  REVIEW_RATING_MAX_VALUE,
  REVIEW_RATING_MIN_VALUE,
} from './constants/review.constants';
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
  @UseInterceptors(
    FilesInterceptor(IMAGE_UPLOAD_FIELD_NAME, MAX_REVIEW_IMAGE_COUNT, {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: MAX_REVIEW_IMAGE_COUNT },
    }),
  )
  @ApiConsumes(...IMAGE_UPLOAD_REQUEST_CONTENT_TYPES)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body', 'rating'],
      properties: {
        body: { type: 'string' },
        rating: {
          type: 'integer',
          minimum: REVIEW_RATING_MIN_VALUE,
          maximum: REVIEW_RATING_MAX_VALUE,
        },
        [IMAGE_UPLOAD_FIELD_NAME]: {
          type: 'array',
          maxItems: MAX_REVIEW_IMAGE_COUNT,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
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
    @Param('tourId', new ParseUUIDPipe({ version: UUID_VERSION_4 }))
    tourId: string,
    @Body() input: CreateReviewDto,
    @UploadedFiles() images?: UploadedImage[],
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.create(user.id, tourId, input, images ?? []);
  }

  @Patch(':tourId/reviews/:reviewId')
  @UseInterceptors(
    FilesInterceptor(IMAGE_UPLOAD_FIELD_NAME, MAX_REVIEW_IMAGE_COUNT, {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: MAX_REVIEW_IMAGE_COUNT },
    }),
  )
  @ApiConsumes(...IMAGE_UPLOAD_REQUEST_CONTENT_TYPES)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: { type: 'string' },
        rating: {
          type: 'integer',
          minimum: REVIEW_RATING_MIN_VALUE,
          maximum: REVIEW_RATING_MAX_VALUE,
        },
        removeImageIds: {
          type: 'string',
          description: 'JSON array of image UUIDs to remove',
          example: '["6a31068a-3336-4d9a-9015-6a61b670873a"]',
        },
        [IMAGE_UPLOAD_FIELD_NAME]: {
          type: 'array',
          maxItems: MAX_REVIEW_IMAGE_COUNT,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Update one of your tour reviews' })
  @ApiParam({ format: 'uuid', name: 'tourId' })
  @ApiParam({ format: 'uuid', name: 'reviewId' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid review data or ID' })
  @ApiNotFoundResponse({ description: 'Review does not exist or is not yours' })
  update(
    @CurrentUser() user: UserEntity,
    @Param('tourId', new ParseUUIDPipe({ version: UUID_VERSION_4 }))
    tourId: string,
    @Param('reviewId', new ParseUUIDPipe({ version: UUID_VERSION_4 }))
    reviewId: string,
    @Body() input: UpdateReviewDto,
    @UploadedFiles() images?: UploadedImage[],
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.updateOwn(
      user.id,
      tourId,
      reviewId,
      input,
      images ?? [],
    );
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
    @Param('tourId', new ParseUUIDPipe({ version: UUID_VERSION_4 }))
    tourId: string,
    @Param('reviewId', new ParseUUIDPipe({ version: UUID_VERSION_4 }))
    reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.removeOwn(user.id, tourId, reviewId);
  }
}
