import { Injectable, NotFoundException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddStaffDto } from './dto/add-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

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
        photoUrl: dto.photoUrl,
        role: dto.role ?? StaffRole.STAFF,
      },
    });
  }

  /** Ensures the staff member belongs to the caller's restaurant. */
  private async requireOwnStaff(uid: string, id: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    const member = await this.prisma.staffMember.findUnique({ where: { id } });
    if (!member || member.restaurantId !== restaurant.id) {
      throw new NotFoundException('Staff member not found');
    }
    return member;
  }

  async update(uid: string, id: string, dto: UpdateStaffDto) {
    await this.requireOwnStaff(uid, id);
    return this.prisma.staffMember.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        photoUrl: dto.photoUrl,
        role: dto.role,
      },
    });
  }

  async remove(uid: string, id: string) {
    await this.requireOwnStaff(uid, id);
    await this.prisma.staffMember.delete({ where: { id } });
    return { deleted: true };
  }
}
