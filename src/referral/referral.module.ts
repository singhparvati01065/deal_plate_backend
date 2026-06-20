import { Module } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  imports: [LoyaltyModule],
  controllers: [ReferralController],
  providers: [ReferralService],
})
export class ReferralModule {}
