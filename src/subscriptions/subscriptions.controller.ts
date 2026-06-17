import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('subscriptions/me')
  mine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.subscriptions.mine(fb.uid);
  }

  @Patch('subscriptions/me')
  setPlan(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body('plan') plan: string,
  ) {
    return this.subscriptions.setPlan(fb.uid, plan);
  }

  @Get('analytics/me')
  analytics(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.subscriptions.analytics(fb.uid);
  }
}
