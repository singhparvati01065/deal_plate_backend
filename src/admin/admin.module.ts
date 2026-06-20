import { Module } from '@nestjs/common';
import { AdminApiController } from './admin-api.controller';
import { AdminService } from './admin.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminApiController],
  providers: [AdminService],
})
export class AdminModule {}
