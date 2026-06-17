import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PromotionType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private readonly withRestaurant = {
    restaurant: true,
    _count: { select: { favorites: true } },
  } as const;

  /** Public browse/search: approved, non-expired promotions. */
  async browse(params: {
    type?: PromotionType;
    cuisine?: string;
    q?: string;
    featured?: boolean;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    from?: Date;
    to?: Date;
  }) {
    const now = new Date();
    // Active deals overlapping the requested window: not yet ended (>= from
    // or now), and started on/before the window's end.
    const from = params.from && params.from > now ? params.from : now;
    const where: Prisma.PromotionWhereInput = {
      status: 'APPROVED',
      endDate: { gte: from },
    };
    if (params.to) where.startDate = { lte: params.to };
    if (params.featured) where.featured = true;
    if (params.type) where.type = params.type;
    if (params.cuisine && params.cuisine !== 'All') {
      where.category = params.cuisine;
    }
    if (params.q && params.q.trim()) {
      const q = params.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { restaurant: { name: { contains: q, mode: 'insensitive' } } },
        { restaurant: { cuisine: { contains: q, mode: 'insensitive' } } },
        { restaurant: { city: { contains: q, mode: 'insensitive' } } },
        { restaurant: { zip: { contains: q } } },
      ];
    }

    const promos = await this.prisma.promotion.findMany({
      where,
      include: this.withRestaurant,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Location-based: keep promos whose restaurant is within radius, sorted
    // nearest-first, with the computed distance attached to each restaurant.
    if (params.lat != null && params.lng != null) {
      const radius = params.radiusKm ?? 15;
      return promos
        .map((p) => {
          const r = p.restaurant;
          if (r?.latitude == null || r?.longitude == null) return null;
          const distanceKm = haversineKm(
            params.lat!,
            params.lng!,
            r.latitude,
            r.longitude,
          );
          if (distanceKm > radius) return null;
          return { ...p, restaurant: { ...r, distance_km: distanceKm } };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort(
          (a, b) => a.restaurant.distance_km - b.restaurant.distance_km,
        );
    }

    return promos;
  }

  async findOne(id: string) {
    const promo = await this.prisma.promotion.update({
      where: { id },
      data: { views: { increment: 1 } },
      include: this.withRestaurant,
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  /** Consumer tapped a call-to-action (directions / call). */
  async recordClick(id: string) {
    await this.prisma.promotion.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
    return { ok: true };
  }

  /** Consumer opened the full-screen flyer image. */
  async recordFlyerView(id: string) {
    await this.prisma.promotion.update({
      where: { id },
      data: { flyerViews: { increment: 1 } },
    });
    return { ok: true };
  }

  private async ownerRestaurant(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: { restaurant: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Only owners can manage promotions');
    }
    if (!user.restaurant) {
      throw new NotFoundException('Create your restaurant first');
    }
    return user.restaurant;
  }

  /** Owner: all of their promotions (any status). */
  async mine(uid: string) {
    const restaurant = await this.ownerRestaurant(uid);
    return this.prisma.promotion.findMany({
      where: { restaurantId: restaurant.id },
      include: this.withRestaurant,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(uid: string, dto: CreatePromotionDto) {
    const restaurant = await this.ownerRestaurant(uid);
    const promo = await this.prisma.promotion.create({
      data: {
        restaurantId: restaurant.id,
        type: dto.type,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        badge: dto.badge,
        imageUrl: dto.imageUrl,
        flyerPdfUrl: dto.flyerPdfUrl,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        // Auto-approve until the admin moderation portal exists, so
        // owner promotions are visible to consumers immediately.
        status: 'APPROVED',
      },
      include: this.withRestaurant,
    });

    // Alert the restaurant's followers (anyone who favorited its deals).
    const followers =
      await this.notifications.restaurantFollowerIds(restaurant.id);
    await this.notifications.notifyUsers(followers, {
      type: 'new_promo',
      title: `New deal at ${restaurant.name}`,
      body: promo.title,
      promotionId: promo.id,
    });

    return promo;
  }

  async update(uid: string, id: string, dto: Partial<CreatePromotionDto>) {
    const restaurant = await this.ownerRestaurant(uid);
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo || promo.restaurantId !== restaurant.id) {
      throw new NotFoundException('Promotion not found');
    }
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: this.withRestaurant,
    });
  }

  /** Owner: toggle the featured flag on their own promotion. */
  async setFeatured(uid: string, id: string, featured: boolean) {
    const restaurant = await this.ownerRestaurant(uid);
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo || promo.restaurantId !== restaurant.id) {
      throw new NotFoundException('Promotion not found');
    }
    return this.prisma.promotion.update({
      where: { id },
      data: { featured },
      include: this.withRestaurant,
    });
  }

  async remove(uid: string, id: string) {
    const restaurant = await this.ownerRestaurant(uid);
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo || promo.restaurantId !== restaurant.id) {
      throw new NotFoundException('Promotion not found');
    }
    await this.prisma.promotion.delete({ where: { id } });
    return { deleted: true };
  }
}

/** Great-circle distance between two coordinates, in kilometres. */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // earth radius (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
