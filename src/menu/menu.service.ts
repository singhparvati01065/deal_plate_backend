import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { AddMenuItemDto } from './dto/add-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
  ) {}

  async byRestaurant(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async mine(uid: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    return this.byRestaurant(restaurant.id);
  }

  async add(uid: string, dto: AddMenuItemDto) {
    const restaurant = await this.restaurants.requireOwned(uid);
    return this.prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async remove(uid: string, id: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item || item.restaurantId !== restaurant.id) {
      throw new NotFoundException('Menu item not found');
    }
    await this.prisma.menuItem.delete({ where: { id } });
    return { deleted: true };
  }
}
