import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
@UseGuards(FirebaseAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me')
  me(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.loyalty.summary(fb.uid);
  }
}
