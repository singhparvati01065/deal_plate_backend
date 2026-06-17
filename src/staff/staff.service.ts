import { Injectable } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddStaffDto } from './dto/add-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
  ) {}

  async listMine(uid: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    return this.prisma.staffMember.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async add(uid: string, dto: AddStaffDto) {
    const restaurant = await this.restaurants.requireOwned(uid);
    return this.prisma.staffMember.create({
      data: {
        restaurantId: restaurant.id,
        name: dto.name,
        email: dto.email,
        role: dto.role ?? StaffRole.STAFF,
      },
    });
  }
}
