import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TourQueryDto } from './dto/tour-query.dto';
import { TourListResponseDto, TourResponseDto } from './dto/tour-response.dto';
import { ToursService } from './tours.service';

@Controller('tours')
@ApiTags('Tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  @ApiOperation({ summary: 'List published tours' })
  @ApiOkResponse({ type: TourListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination or filter' })
  findPublic(@Query() query: TourQueryDto) {
    return this.toursService.findPublic(query);
  }

  @Get(':tourId')
  @ApiOperation({ summary: 'Get a published tour by ID' })
  @ApiParam({ name: 'tourId', format: 'uuid' })
  @ApiOkResponse({ type: TourResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour ID' })
  @ApiNotFoundResponse({ description: 'Tour does not exist' })
  findById(
    @Param('tourId', new ParseUUIDPipe({ version: '4' })) tourId: string,
  ): Promise<TourResponseDto> {
    return this.toursService.findPublicById(tourId);
  }
}
