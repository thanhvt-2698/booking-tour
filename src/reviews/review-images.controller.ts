import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import {
  CACHE_CONTROL_HEADER,
  CACHE_CONTROL_NO_STORE_VALUE,
  CONTENT_TYPE_OPTIONS_HEADER,
  CONTENT_TYPE_OPTIONS_NOSNIFF_VALUE,
} from '../common/constants/security.constants';
import { IMAGE_MIME_TYPES } from '../files/constants/file.constants';
import { REVIEW_IMAGE_ROUTE_NAME } from './constants/review.constants';
import { ReviewImagesService } from './review-images.service';

@Controller(REVIEW_IMAGE_ROUTE_NAME)
@ApiTags('Reviews')
export class ReviewImagesController {
  constructor(private readonly imagesService: ReviewImagesService) {}

  @Get(':filename')
  @Header(CACHE_CONTROL_HEADER, CACHE_CONTROL_NO_STORE_VALUE)
  @Header(CONTENT_TYPE_OPTIONS_HEADER, CONTENT_TYPE_OPTIONS_NOSNIFF_VALUE)
  @ApiOperation({ summary: 'Download an image of a published tour review' })
  @ApiParam({
    name: 'filename',
    description: 'Filename from the review image URL',
  })
  @ApiProduces(...Object.values(IMAGE_MIME_TYPES))
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiBadRequestResponse({ description: 'Invalid image filename' })
  @ApiNotFoundResponse({ description: 'Published review image does not exist' })
  download(@Param('filename') filename: string): Promise<StreamableFile> {
    return this.imagesService.download(filename);
  }
}
