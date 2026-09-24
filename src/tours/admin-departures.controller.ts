import {
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { DepartureResponseDto } from './dto/departure-response.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';

@Controller('admin/departures')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Administration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Bearer token is missing, invalid, expired, or blocked',
})
@ApiForbiddenResponse({ description: 'ADMIN role required' })
export class AdminDeparturesController {
  constructor(private readonly departuresService: DeparturesService) {}

  @Patch(':departureId')
  @ApiOperation({ summary: 'Update a departure schedule or availability' })
  @ApiParam({ name: 'departureId', format: 'uuid' })
  @ApiOkResponse({ type: DepartureResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid departure schedule or ID' })
  @ApiConflictResponse({
    description: 'Departure cannot be changed in its current state',
  })
  @ApiNotFoundResponse({ description: 'Departure does not exist' })
  update(
    @Param('departureId', new ParseUUIDPipe({ version: '4' }))
    departureId: string,
    @Body() input: UpdateDepartureDto,
  ): Promise<DepartureResponseDto> {
    return this.departuresService.update(departureId, input);
  }

  @Delete(':departureId')
  @ApiOperation({ summary: 'Cancel a departure without active reservations' })
  @ApiParam({ name: 'departureId', format: 'uuid' })
  @ApiOkResponse({ type: DepartureResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid departure ID' })
  @ApiConflictResponse({
    description: 'Departure has reservations or has started',
  })
  @ApiNotFoundResponse({ description: 'Departure does not exist' })
  cancel(
    @Param('departureId', new ParseUUIDPipe({ version: '4' }))
    departureId: string,
  ): Promise<DepartureResponseDto> {
    return this.departuresService.cancel(departureId);
  }
}
