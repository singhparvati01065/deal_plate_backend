import { Module } from '@nestjs/common';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [RestaurantsModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
