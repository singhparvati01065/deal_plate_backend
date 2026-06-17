import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { RestaurantsService } from './restaurants.service';
import { UpsertRestaurantDto } from './dto/upsert-restaurant.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  /** Public: nearby restaurants. */
  @Get('nearby')
  nearby(@Query() q: NearbyQueryDto) {
    return this.restaurants.nearby(q.lat, q.lng, q.radiusKm);
  }

  /** Owner: their own restaurant. */
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  mine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.restaurants.mine(fb.uid);
  }

  /** Owner: create their restaurant. */
  @Post()
  @UseGuards(FirebaseAuthGuard)
  create(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() dto: UpsertRestaurantDto,
  ) {
    return this.restaurants.upsertMine(fb.uid, dto);
  }

  /** Owner: update their restaurant. */
  @Patch('me')
  @UseGuards(FirebaseAuthGuard)
  update(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() dto: UpsertRestaurantDto,
  ) {
    return this.restaurants.upsertMine(fb.uid, dto);
  }

  /** Owner: add a photo URL to their gallery. */
  @Post('me/photos')
  @UseGuards(FirebaseAuthGuard)
  addPhoto(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body('url') url: string,
  ) {
    return this.restaurants.addPhoto(fb.uid, url);
  }

  /** Owner: remove a photo from their gallery. */
  @Delete('me/photos')
  @UseGuards(FirebaseAuthGuard)
  removePhoto(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body('url') url: string,
  ) {
    return this.restaurants.removePhoto(fb.uid, url);
  }

  /** Public: a restaurant profile + its active promotions. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurants.findOne(id);
  }
}
