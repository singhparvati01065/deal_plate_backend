import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { MenuService } from './menu.service';
import { AddMenuItemDto } from './dto/add-menu-item.dto';

@Controller()
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  /** Public: a restaurant's menu. */
  @Get('restaurants/:id/menu')
  byRestaurant(@Param('id') id: string) {
    return this.menu.byRestaurant(id);
  }

  /** Owner: own menu. */
  @Get('menu')
  @UseGuards(FirebaseAuthGuard)
  mine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.menu.mine(fb.uid);
  }

  @Post('menu')
  @UseGuards(FirebaseAuthGuard)
  add(@CurrentFirebaseUser() fb: FirebaseUser, @Body() dto: AddMenuItemDto) {
    return this.menu.add(fb.uid, dto);
  }

  @Delete('menu/:id')
  @UseGuards(FirebaseAuthGuard)
  remove(@CurrentFirebaseUser() fb: FirebaseUser, @Param('id') id: string) {
    return this.menu.remove(fb.uid, id);
  }
}
