import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import {
  ReviewsController,
  PublicReviewsController,
} from './reviews.controller';

@Module({
  controllers: [ReviewsController, PublicReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
