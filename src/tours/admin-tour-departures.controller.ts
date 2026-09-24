import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/constants/user.constants';
import { DeparturesService } from './departures.service';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { AdminDepartureQueryDto } from './dto/departure-query.dto';
import {
  DepartureListResponseDto,
  DepartureResponseDto,
} from './dto/departure-response.dto';
import type { DepartureList } from './interfaces/departure-list.interface';

@Controller('admin/tours')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Administration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Bearer token is missing, invalid, expired, or blocked',
})
@ApiForbiddenResponse({ description: 'ADMIN role required' })
export class AdminTourDeparturesController {
  constructor(private readonly departuresService: DeparturesService) {}

  @Get(':tourId/departures')
  @ApiOperation({ summary: 'List departures for tour administration' })
  @ApiParam({ name: 'tourId', format: 'uuid' })
  @ApiOkResponse({ type: DepartureListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid tour ID or pagination' })
  @ApiNotFoundResponse({ description: 'Tour does not exist' })
  findForAdminByTour(
    @Param('tourId', new ParseUUIDPipe({ version: '4' })) tourId: string,
    @Query() query: AdminDepartureQueryDto,
  ): Promise<DepartureList> {
    return this.departuresService.findForAdminByTour(tourId, query);
  }

  @Post(':tourId/departures')
  @ApiOperation({ summary: 'Create a tour departure' })
  @ApiParam({ name: 'tourId', format: 'uuid' })
  @ApiCreatedResponse({ type: DepartureResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid departure schedule' })
  @ApiConflictResponse({
    description: 'Archived tours cannot receive departures',
  })
  @ApiNotFoundResponse({ description: 'Tour does not exist' })
  create(
    @Param('tourId', new ParseUUIDPipe({ version: '4' })) tourId: string,
    @Body() input: CreateDepartureDto,
  ): Promise<DepartureResponseDto> {
    return this.departuresService.create(tourId, input);
  }
}
