import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private service: RecommendationsService) {}

  @Get('for-you')
  @UseGuards(JwtAuthGuard)
  async getForYou(@CurrentUser() user: any, @Query('limit') limit?: number) {
    return this.service.getRecommendations(user.id, limit ? +limit : 10);
  }

  @Get('related/:productId')
  async getRelated(
    @Param('productId') productId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getRelatedProducts(productId, limit ? +limit : 6);
  }

  @Get('hot')
  async getHot(@Query('limit') limit?: number) {
    return this.service.getHotProducts(limit ? +limit : 10);
  }

  @Get('new')
  async getNew(@Query('limit') limit?: number) {
    return this.service.getNewProducts(limit ? +limit : 10);
  }
}
