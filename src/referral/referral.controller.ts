import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { ReferralService } from './referral.service';

@Controller('referral')
@UseGuards(FirebaseAuthGuard)
export class ReferralController {
  constructor(private readonly referral: ReferralService) {}

  @Get('me')
  me(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.referral.myReferral(fb.uid);
  }

  @Post('apply')
  apply(@CurrentFirebaseUser() fb: FirebaseUser, @Body('code') code: string) {
    return this.referral.apply(fb.uid, code);
  }
}
