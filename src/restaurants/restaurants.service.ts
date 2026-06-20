import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRestaurantDto } from './dto/upsert-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the owner's restaurant, throwing if not an owner / not created. */
  async requireOwned(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: { restaurant: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Only owners can manage a restaurant');
    }
    if (!user.restaurant) {
      throw new NotFoundException('No restaurant yet');
    }
    return user.restaurant;
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        promotions: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!restaurant || restaurant.suspended) {
      throw new NotFoundException('Restaurant not found');
    }
    return restaurant;
  }

  async mine(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: { restaurant: { include: { subscription: true } } },
    });
    return user?.restaurant ?? null;
  }

  /** Create or update the owner's restaurant (also seeds a Starter subscription). */
  async upsertMine(uid: string, dto: UpsertRestaurantDto) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Only owners can manage a restaurant');
    }

    return this.prisma.restaurant.upsert({
      where: { ownerId: user.id },
      create: {
        ownerId: user.id,
        ...dto,
        subscription: { create: { plan: 'STARTER', promosLimit: 2 } },
      },
      update: { ...dto },
      include: { subscription: true },
    });
  }

  async addPhoto(uid: string, url: string) {
    const restaurant = await this.requireOwned(uid);
    return this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { photos: { push: url } },
    });
  }

  async removePhoto(uid: string, url: string) {
    const restaurant = await this.requireOwned(uid);
    return this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { photos: restaurant.photos.filter((p) => p !== url) },
    });
  }

  /** Restaurants near a point (Haversine). */
  async nearby(lat: number, lng: number, radiusKm = 15) {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT * FROM (
        SELECT id, name, cuisine, "coverImageUrl", "logoUrl", rating,
          "reviewCount", "addressLine", city, state, zip, phone, latitude, longitude,
          (6371 * acos(LEAST(1, GREATEST(-1,
            cos(radians(${lat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(latitude))
          )))) AS distance_km
        FROM "Restaurant"
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND suspended = false
      ) AS r
      WHERE distance_km <= ${radiusKm}
      ORDER BY distance_km ASC
      LIMIT 100;
    `);
  }
}
