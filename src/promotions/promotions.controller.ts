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
import { PromotionType } from '@prisma/client';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  /** Public: browse / search promotions. */
  @Get()
  browse(
    @Query('type') type?: PromotionType,
    @Query('cuisine') cuisine?: string,
    @Query('q') q?: string,
    @Query('featured') featured?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.promotions.browse({
      type,
      cuisine,
      q,
      featured: featured === 'true',
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
      radiusKm: radiusKm != null ? Number(radiusKm) : undefined,
      from: from != null ? new Date(from) : undefined,
      to: to != null ? new Date(to) : undefined,
    });
  }

  /** Owner: all of their promotions. */
  @Get('mine')
  @UseGuards(FirebaseAuthGuard)
  mine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.promotions.mine(fb.uid);
  }

  /** Public: a single promotion (increments views). */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotions.findOne(id);
  }

  /** Public: record a click-through (acted on the offer). */
  @Patch(':id/click')
  recordClick(@Param('id') id: string) {
    return this.promotions.recordClick(id);
  }

  /** Public: record a full flyer view. */
  @Patch(':id/flyer-view')
  recordFlyerView(@Param('id') id: string) {
    return this.promotions.recordFlyerView(id);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard)
  create(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() dto: CreatePromotionDto,
  ) {
    return this.promotions.create(fb.uid, dto);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard)
  update(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePromotionDto>,
  ) {
    return this.promotions.update(fb.uid, id, dto);
  }

  @Patch(':id/feature')
  @UseGuards(FirebaseAuthGuard)
  setFeatured(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Param('id') id: string,
    @Body('featured') featured: boolean,
  ) {
    return this.promotions.setFeatured(fb.uid, id, featured !== false);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  remove(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.promotions.remove(fb.uid, id);
  }
}
