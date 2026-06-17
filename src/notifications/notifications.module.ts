import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ExpiringDealsTask } from './expiring-deals.task';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, ExpiringDealsTask],
  exports: [NotificationsService],
})
export class NotificationsModule {}
