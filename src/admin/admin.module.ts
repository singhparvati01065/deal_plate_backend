import { Module } from '@nestjs/common';
import { AdminApiController } from './admin-api.controller';
import { AdminService } from './admin.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlansModule } from '../plans/plans.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [NotificationsModule, PlansModule, ReviewsModule],
  controllers: [AdminApiController],
  providers: [AdminService],
})
export class AdminModule {}
