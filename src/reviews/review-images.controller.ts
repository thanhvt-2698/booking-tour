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
import { ReviewImagesService } from './review-images.service';

@Controller('review-images')
@ApiTags('Reviews')
export class ReviewImagesController {
  constructor(private readonly imagesService: ReviewImagesService) {}

  @Get(':filename')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Download an image of a published tour review' })
  @ApiParam({
    name: 'filename',
    description: 'Filename from the review image URL',
  })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiBadRequestResponse({ description: 'Invalid image filename' })
  @ApiNotFoundResponse({ description: 'Published review image does not exist' })
  download(@Param('filename') filename: string): Promise<StreamableFile> {
    return this.imagesService.download(filename);
  }
}
