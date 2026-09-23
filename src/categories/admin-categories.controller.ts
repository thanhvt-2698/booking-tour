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
import { CategoriesService } from './categories.service';
import { CategoryQueryDto } from './dto/category-query.dto';
import {
  CategoryListResponseDto,
  CategoryResponseDto,
} from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { CategoryList } from './interfaces/category-list.interface';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Administration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Bearer token is missing, invalid, expired, or blocked',
})
@ApiForbiddenResponse({ description: 'ADMIN role required' })
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid category data' })
  @ApiConflictResponse({ description: 'Category name or slug already exists' })
  create(@Body() input: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List categories for administration' })
  @ApiOkResponse({ type: CategoryListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination or filter' })
  findMany(@Query() query: CategoryQueryDto): Promise<CategoryList> {
    return this.categoriesService.findMany(query);
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'categoryId', format: 'uuid' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid category ID' })
  @ApiNotFoundResponse({ description: 'Category does not exist' })
  findById(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' }))
    categoryId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.findById(categoryId);
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'categoryId', format: 'uuid' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid category data or ID' })
  @ApiConflictResponse({ description: 'Category name or slug already exists' })
  @ApiNotFoundResponse({ description: 'Category does not exist' })
  update(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' }))
    categoryId: string,
    @Body() input: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(categoryId, input);
  }

  @Delete(':categoryId')
  @ApiOperation({ summary: 'Archive a category' })
  @ApiParam({ name: 'categoryId', format: 'uuid' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid category ID' })
  @ApiNotFoundResponse({ description: 'Category does not exist' })
  archive(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' }))
    categoryId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.archive(categoryId);
  }
}
