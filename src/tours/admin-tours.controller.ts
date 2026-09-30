import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UUID_VERSION_4 } from '../common/constants/validation.constants';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/constants/user.constants';
import { UserEntity } from '../users/entities/user.entity';
import {
  IMAGE_UPLOAD_FIELD_NAME,
  IMAGE_UPLOAD_REQUEST_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '../files/constants/file.constants';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import { MAX_TOUR_IMAGE_COUNT } from './constants/tour.constants';
import { CreateTourDto } from './dto/create-tour.dto';
import { CreateTourWithImagesDto } from './dto/create-tour-with-images.dto';
import { TourQueryDto } from './dto/tour-query.dto';
import { TourListResponseDto, TourResponseDto } from './dto/tour-response.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { UpdateTourWithImagesDto } from './dto/update-tour-with-images.dto';
import { ToursService } from './tours.service';

@Controller('admin/tours')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Administration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Bearer token is missing, invalid, expired, or blocked',
})
@ApiForbiddenResponse({ description: 'ADMIN role required' })
export class AdminToursController {
  constructor(private readonly toursService: ToursService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tour' })
  @ApiCreatedResponse({ type: TourResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour data' })
  @ApiConflictResponse({ description: 'Tour code or slug already exists' })
  @ApiConsumes(...IMAGE_UPLOAD_REQUEST_CONTENT_TYPES)
  @ApiBody({ type: CreateTourWithImagesDto })
  @UseInterceptors(
    FilesInterceptor(IMAGE_UPLOAD_FIELD_NAME, MAX_TOUR_IMAGE_COUNT, {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  create(
    @CurrentUser() actor: UserEntity,
    @Body() input: CreateTourDto,
    @UploadedFiles() images?: UploadedImage[],
  ): Promise<TourResponseDto> {
    return this.toursService.create(actor.id, input, images);
  }

  @Get()
  @ApiOperation({ summary: 'List tours for administration' })
  @ApiOkResponse({ type: TourListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination or filter' })
  findMany(@Query() query: TourQueryDto) {
    return this.toursService.findMany(query);
  }

  @Get(':tourId')
  @ApiOperation({ summary: 'Get a tour by ID' })
  @ApiParam({ name: 'tourId', format: 'uuid' })
  @ApiOkResponse({ type: TourResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour ID' })
  @ApiNotFoundResponse({ description: 'Tour does not exist' })
  findById(
    @Param('tourId', new ParseUUIDPipe({ version: UUID_VERSION_4 }))
    tourId: string,
  ): Promise<TourResponseDto> {
    return this.toursService.findById(tourId);
  }

  @Patch(':tourId')
  @ApiOperation({ summary: 'Update a tour' })
  @ApiParam({ name: 'tourId', format: 'uuid' })
  @ApiOkResponse({ type: TourResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour data or ID' })
  @ApiConflictResponse({ description: 'Tour code or slug already exists' })
  @ApiNotFoundResponse({ description: 'Tour does not exist' })
  @ApiConsumes(...IMAGE_UPLOAD_REQUEST_CONTENT_TYPES)
  @ApiBody({ type: UpdateTourWithImagesDto })
  @UseInterceptors(
    FilesInterceptor(IMAGE_UPLOAD_FIELD_NAME, MAX_TOUR_IMAGE_COUNT, {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  update(
    @Param('tourId', new ParseUUIDPipe({ version: UUID_VERSION_4 }))
    tourId: string,
    @Body() input: UpdateTourDto,
    @UploadedFiles() images?: UploadedImage[],
  ): Promise<TourResponseDto> {
    return this.toursService.update(tourId, input, images);
  }

  @Delete(':tourId')
  @ApiOperation({ summary: 'Archive a tour' })
  @ApiParam({ name: 'tourId', format: 'uuid' })
  @ApiOkResponse({ type: TourResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour ID' })
  @ApiNotFoundResponse({ description: 'Tour does not exist' })
  archive(
    @Param('tourId', new ParseUUIDPipe({ version: UUID_VERSION_4 }))
    tourId: string,
  ): Promise<TourResponseDto> {
    return this.toursService.archive(tourId);
  }
}
