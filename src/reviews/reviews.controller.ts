import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Public: list a restaurant's reviews. */
  @Get('restaurant/:restaurantId')
  list(@Param('restaurantId') restaurantId: string) {
    return this.reviews.listForRestaurant(restaurantId);
  }

  /** Consumer: my existing review for a restaurant (or null). */
  @Get('mine/:restaurantId')
  @UseGuards(FirebaseAuthGuard)
  mine(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.reviews.mine(fb.uid, restaurantId);
  }

  /** Consumer: create or update my review. */
  @Post()
  @UseGuards(FirebaseAuthGuard)
  submit(@CurrentFirebaseUser() fb: FirebaseUser, @Body() dto: CreateReviewDto) {
    return this.reviews.submit(fb.uid, dto);
  }

  /** Consumer: delete my review. */
  @Delete('restaurant/:restaurantId')
  @UseGuards(FirebaseAuthGuard)
  remove(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.reviews.remove(fb.uid, restaurantId);
  }
}
