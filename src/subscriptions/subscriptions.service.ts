import { BadRequestException, Injectable } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { PrismaService } from '../prisma/prisma.service';

/** Active-promotion allowance per plan (Premium = effectively unlimited). */
export const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  STARTER: 2,
  PRO: 15,
  PREMIUM: 9999,
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
  ) {}

  async mine(uid: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    let sub = await this.prisma.subscription.findUnique({
      where: { restaurantId: restaurant.id },
    });
    sub ??= await this.prisma.subscription.create({
      data: { restaurantId: restaurant.id, plan: 'STARTER', promosLimit: 2 },
    });
    const promosUsed = await this.prisma.promotion.count({
      where: { restaurantId: restaurant.id },
    });
    return { ...sub, promosUsed };
  }

  /** Switch the owner's plan (no payment gateway yet — applies immediately). */
  async setPlan(uid: string, plan: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    const key = (plan ?? '').toUpperCase() as SubscriptionPlan;
    if (!(key in PLAN_LIMITS)) {
      throw new BadRequestException('Invalid plan');
    }
    const sub = await this.prisma.subscription.upsert({
      where: { restaurantId: restaurant.id },
      create: {
        restaurantId: restaurant.id,
        plan: key,
        promosLimit: PLAN_LIMITS[key],
      },
      update: { plan: key, promosLimit: PLAN_LIMITS[key] },
    });
    const promosUsed = await this.prisma.promotion.count({
      where: { restaurantId: restaurant.id },
    });
    return { ...sub, promosUsed };
  }

  /** Aggregate analytics for the owner dashboard/insights. */
  async analytics(uid: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    const agg = await this.prisma.promotion.aggregate({
      where: { restaurantId: restaurant.id },
      _sum: { views: true, clicks: true, flyerViews: true },
    });
    const favorites = await this.prisma.favorite.count({
      where: { promotion: { restaurantId: restaurant.id } },
    });
    const top = await this.prisma.promotion.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { views: 'desc' },
      include: { _count: { select: { favorites: true } } },
    });
    return {
      totalViews: agg._sum.views ?? 0,
      totalClicks: agg._sum.clicks ?? 0,
      flyerViews: agg._sum.flyerViews ?? 0,
      favoritesAdded: favorites,
      topPromotion: top,
    };
  }
}
