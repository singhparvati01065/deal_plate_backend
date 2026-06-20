import { Module } from '@nestjs/common';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { CateringController } from './catering.controller';
import { CateringService } from './catering.service';

@Module({
  imports: [RestaurantsModule],
  controllers: [CateringController],
  providers: [CateringService],
})
export class CateringModule {}
