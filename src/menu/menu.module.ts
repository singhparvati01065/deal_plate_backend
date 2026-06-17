import { Module } from '@nestjs/common';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [RestaurantsModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
