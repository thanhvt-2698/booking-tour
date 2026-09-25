import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DeparturesService } from './departures.service';
import { DepartureQueryDto } from './dto/departure-query.dto';
import { DepartureListResponseDto } from './dto/departure-response.dto';
import { PublicTourQueryDto } from './dto/tour-query.dto';
import { TourListResponseDto, TourResponseDto } from './dto/tour-response.dto';
import type { DepartureList } from './interfaces/departure-list.interface';
import type { TourList } from './interfaces/tour-list.interface';
import { ToursService } from './tours.service';

@Controller('tours')
@ApiTags('Tours')
export class ToursController {
  constructor(
    private readonly departuresService: DeparturesService,
    private readonly toursService: ToursService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published tours' })
  @ApiOkResponse({ type: TourListResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid pagination or departure date range',
  })
  findPublic(@Query() query: PublicTourQueryDto): Promise<TourList> {
    return this.toursService.findPublic(query);
  }

  @Get(':tourId/departures')
  @ApiOperation({ summary: 'List available future departures for a tour' })
  @ApiParam({ name: 'tourId', format: 'uuid' })
  @ApiOkResponse({ type: DepartureListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour ID or pagination' })
  @ApiNotFoundResponse({ description: 'Published tour does not exist' })
  findPublicDepartures(
    @Param('tourId', new ParseUUIDPipe({ version: '4' })) tourId: string,
    @Query() query: DepartureQueryDto,
  ): Promise<DepartureList> {
    return this.departuresService.findPublicByTour(tourId, query);
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
