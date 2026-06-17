import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(FirebaseAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  listMine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.favorites.listMine(fb.uid);
  }

  @Get('ids')
  myIds(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.favorites.myIds(fb.uid);
  }

  @Post(':promotionId')
  toggle(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Param('promotionId') promotionId: string,
  ) {
    return this.favorites.toggle(fb.uid, promotionId);
  }
}
