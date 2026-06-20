import { Module } from '@nestjs/common';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [RestaurantsModule, LoyaltyModule],
  controllers: [CouponsController],
  providers: [CouponsService],
})
export class CouponsModule {}
