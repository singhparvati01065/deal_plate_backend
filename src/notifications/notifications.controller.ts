import { Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { NotificationsService } from './notifications.service';
import { ExpiringDealsTask } from './expiring-deals.task';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly expiringDeals: ExpiringDealsTask,
  ) {}

  @Get()
  mine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.notifications.listMine(fb.uid);
  }

  @Patch('read')
  markAllRead(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.notifications.markAllRead(fb.uid);
  }

  /** Run the expiring-deal check now (also runs daily on a cron). */
  @Post('run-expiry')
  runExpiry() {
    return this.expiringDeals.run();
  }
}
