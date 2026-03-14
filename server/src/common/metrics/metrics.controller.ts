import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('监控')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  @ApiExcludeEndpoint()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metricsService.getMetrics();
    res.set('Content-Type', this.metricsService.getContentType());
    res.end(metrics);
  }
}
