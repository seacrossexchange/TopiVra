import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '全局搜索' })
  async globalSearch(@Query('keyword') keyword: string) {
    return this.searchService.globalSearch(keyword);
  }

  @Public()
  @Get('products')
  @ApiOperation({ summary: '商品搜索' })
  async searchProducts(
    @Query('keyword') keyword: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.searchService.searchProducts(keyword, +page, +limit);
  }

  @Public()
  @Get('hot-keywords')
  @ApiOperation({ summary: '获取热门搜索关键词' })
  async getHotKeywords() {
    return this.searchService.getHotKeywords();
  }
}
