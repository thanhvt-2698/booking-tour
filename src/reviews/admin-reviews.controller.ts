import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/constants/user.constants';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
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
