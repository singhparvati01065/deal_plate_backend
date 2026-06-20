import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { CouponsService } from './coupons.service';

@Controller('coupons')
@UseGuards(FirebaseAuthGuard)
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  /** Consumer: claim a coupon for a promotion. */
  @Post()
  claim(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body('promotionId') promotionId: string,
  ) {
    return this.coupons.claim(fb.uid, promotionId);
  }

  /** Consumer: my coupons. */
  @Get()
  mine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.coupons.mine(fb.uid);
  }

  /** Owner: redeem a coupon by code (scanned QR or typed). */
  @Post('redeem')
  redeem(@CurrentFirebaseUser() fb: FirebaseUser, @Body('code') code: string) {
    return this.coupons.redeem(fb.uid, code);
  }
}
