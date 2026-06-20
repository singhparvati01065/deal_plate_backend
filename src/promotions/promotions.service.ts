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
    // A deal stays active through the END of its end-date day, so compare
    // against the start of today (not the current time) — otherwise a deal
    // ending "today" would vanish partway through the day.
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    // Active deals overlapping the requested window: not yet ended (>= from
    // or today), and started on/before the window's end.
    const from =
      params.from && params.from > startOfToday ? params.from : startOfToday;
    const where: Prisma.PromotionWhereInput = {
      status: 'APPROVED',
      endDate: { gte: from },
      restaurant: { suspended: false },
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

    // Location-aware results. Distance is always computed when we know the
    // user's coordinates, and the list is sorted nearest-first. The radius
    // filter only kicks in when an explicit radiusKm is passed (the "Near me"
    // toggle) — otherwise every promotion stays visible, just annotated with a
    // distance. Restaurants without coordinates are kept (distance unknown),
    // sorted to the end.
    if (params.lat != null && params.lng != null) {
      const radius = params.radiusKm; // undefined => no radius filtering
      const scored = promos.map((p) => {
        const r = p.restaurant;
        const distanceKm =
          r?.latitude == null || r?.longitude == null
            ? null
            : haversineKm(params.lat!, params.lng!, r.latitude, r.longitude);
        return { promo: p, distanceKm };
      });

      return scored
        .filter((x) => {
          if (radius == null) return true; // no "Near me" filter
          return x.distanceKm != null && x.distanceKm <= radius;
        })
        .sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        })
        .map((x) =>
          x.distanceKm == null
            ? x.promo
            : {
                ...x.promo,
                restaurant: { ...x.promo.restaurant, distance_km: x.distanceKm },
              },
        );
    }

    return promos;
  }

  /** Public: upcoming EVENT-type promotions, soonest first. */
  async events() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    return this.prisma.promotion.findMany({
      where: {
        status: 'APPROVED',
        type: 'EVENT',
        endDate: { gte: startOfToday },
        restaurant: { suspended: false },
      },
      include: this.withRestaurant,
      orderBy: [{ eventAt: 'asc' }, { startDate: 'asc' }],
      take: 100,
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
      include: this.withRestaurant,
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    // Increment views without failing the read if the row vanished.
    await this.prisma.promotion
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => undefined);
    return { ...promo, views: promo.views + 1 };
  }

  /** Consumer tapped a call-to-action (directions / call). */
  async recordClick(id: string) {
    await this.prisma.promotion
      .update({ where: { id }, data: { clicks: { increment: 1 } } })
      .catch(() => undefined);
    return { ok: true };
  }

  /** Consumer opened the full-screen flyer image. */
  async recordFlyerView(id: string) {
    await this.prisma.promotion
      .update({ where: { id }, data: { flyerViews: { increment: 1 } } })
      .catch(() => undefined);
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
    // Auto-approve so deals go live immediately; admin can still reject/suspend
    // from the admin portal.
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
        eventAt: dto.eventAt ? new Date(dto.eventAt) : null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'APPROVED',
      },
      include: this.withRestaurant,
    });

    // Alert the restaurant's followers that a new deal is live.
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
        eventAt: dto.eventAt ? new Date(dto.eventAt) : undefined,
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
