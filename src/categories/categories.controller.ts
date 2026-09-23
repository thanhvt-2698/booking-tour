import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CategoryQueryDto } from './dto/category-query.dto';
import {
  CategoryListResponseDto,
  CategoryResponseDto,
} from './dto/category-response.dto';
import type { CategoryList } from './interfaces/category-list.interface';

@Controller('categories')
@ApiTags('Categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List active categories' })
  @ApiOkResponse({ type: CategoryListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination or filter' })
  findPublic(@Query() query: CategoryQueryDto): Promise<CategoryList> {
    return this.categoriesService.findPublic(query);
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Get an active category by ID' })
  @ApiParam({ name: 'categoryId', format: 'uuid' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid category ID' })
  @ApiNotFoundResponse({ description: 'Category does not exist' })
  findById(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' }))
    categoryId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.findPublicById(categoryId);
  }
}
