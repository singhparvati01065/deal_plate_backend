import { Injectable } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PLAN_LIMITS } from '../subscriptions/subscriptions.service';
import { adminJwtSecret } from './admin-api.guard';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  verifyCredentials(email: string, password: string): boolean {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@dealplate.com';
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    return email?.trim().toLowerCase() === adminEmail.toLowerCase() &&
      password === adminPassword;
  }

  /** Issue an 8h admin JWT for the web portal. */
  issueToken(): string {
    return jwt.sign({ admin: true }, adminJwtSecret(), { expiresIn: '8h' });
  }

  /** Record an admin action for the audit trail. */
  async audit(
    action: string,
    entity?: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: process.env.ADMIN_EMAIL ?? 'admin',
        action,
        entity,
        entityId,
        metadata: metadata as object,
      },
    });
  }

  // ---- Reporting dashboard (platform analytics) ----
  async dashboard() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers,
      activeDevices,
      active7d,
      active30d,
      totalRestaurants,
      totalPromotions,
      pendingPromotions,
      activePromotions,
      perf,
      favorites,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.deviceToken
        .findMany({ select: { userId: true }, distinct: ['userId'] })
        .then((r) => r.length),
      this.prisma.user.count({ where: { lastSeenAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: monthAgo } } }),
      this.prisma.restaurant.count(),
      this.prisma.promotion.count(),
      this.prisma.promotion.count({ where: { status: 'PENDING' } }),
      this.prisma.promotion.count({
        where: { status: 'APPROVED', endDate: { gte: now } },
      }),
      this.prisma.promotion.aggregate({
        _sum: { views: true, clicks: true, flyerViews: true },
      }),
      this.prisma.favorite.count(),
    ]);

    // Restaurants with at least one live deal.
    const activeRestaurantRows = await this.prisma.promotion.findMany({
      where: { status: 'APPROVED', endDate: { gte: now } },
      select: { restaurantId: true },
      distinct: ['restaurantId'],
    });

    // Geographic: restaurant coverage by city.
    const byCity = await this.prisma.restaurant.groupBy({
      by: ['city'],
      _count: { _all: true },
      orderBy: { _count: { city: 'desc' } },
      take: 10,
    });

    // Geographic: where users are — map each located user to the nearest
    // restaurant's city, then tally.
    const [locatedUsers, locatedRestaurants] = await Promise.all([
      this.prisma.user.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { latitude: true, longitude: true },
      }),
      this.prisma.restaurant.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { city: true, latitude: true, longitude: true },
      }),
    ]);
    const areaTally: Record<string, number> = {};
    for (const u of locatedUsers) {
      let best: { city: string | null; d: number } | null = null;
      for (const r of locatedRestaurants) {
        const d = haversineKm(u.latitude!, u.longitude!, r.latitude!, r.longitude!);
        if (!best || d < best.d) best = { city: r.city, d };
      }
      const key = best?.city || 'Unknown';
      areaTally[key] = (areaTally[key] || 0) + 1;
    }
    const usersByArea = Object.entries(areaTally)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalUsers,
      newUsers,
      activeDevices,
      activeUsers7d: active7d,
      activeUsers30d: active30d,
      usersWithLocation: locatedUsers.length,
      totalRestaurants,
      activeRestaurants: activeRestaurantRows.length,
      totalPromotions,
      pendingPromotions,
      activePromotions,
      totalViews: perf._sum.views ?? 0,
      totalClicks: perf._sum.clicks ?? 0,
      totalFlyerViews: perf._sum.flyerViews ?? 0,
      favorites,
      byCity: byCity.map((c) => ({
        city: c.city || '—',
        count: c._count._all,
      })),
      usersByArea,
    };
  }

  async users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { restaurant: { select: { name: true } }, _count: { select: { devices: true, favorites: true } } },
      take: 500,
    });
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
    await this.audit('user.delete', 'User', id);
  }

  async restaurants() {
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { select: { plan: true } },
        _count: { select: { promotions: true } },
      },
      take: 500,
    });
  }

  async setRestaurantSuspended(id: string, suspended: boolean) {
    await this.prisma.restaurant.update({ where: { id }, data: { suspended } });
    await this.audit(
      suspended ? 'restaurant.suspend' : 'restaurant.unsuspend',
      'Restaurant',
      id,
    );
  }

  async deleteRestaurant(id: string) {
    await this.prisma.restaurant.delete({ where: { id } });
    await this.audit('restaurant.delete', 'Restaurant', id);
  }

  async setRestaurantPlan(id: string, plan: string) {
    const key = (plan ?? '').toUpperCase() as SubscriptionPlan;
    if (!(key in PLAN_LIMITS)) throw new Error('Invalid plan');
    await this.prisma.subscription.upsert({
      where: { restaurantId: id },
      create: { restaurantId: id, plan: key, promosLimit: PLAN_LIMITS[key] },
      update: { plan: key, promosLimit: PLAN_LIMITS[key] },
    });
    await this.audit('subscription.change', 'Restaurant', id, { plan: key });
  }

  async promotions(status?: string) {
    return this.prisma.promotion.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { restaurant: { select: { name: true } } },
      take: 500,
    });
  }

  async setPromotionStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    const before = await this.prisma.promotion.findUnique({
      where: { id },
      include: { restaurant: { select: { id: true, name: true } } },
    });
    if (!before) return;
    await this.prisma.promotion.update({ where: { id }, data: { status } });
    await this.audit(
      status === 'APPROVED' ? 'promotion.approve' : 'promotion.reject',
      'Promotion',
      id,
    );

    // Going live (first approval) → alert the restaurant's followers.
    if (status === 'APPROVED' && before.status !== 'APPROVED') {
      const followers = await this.notifications.restaurantFollowerIds(
        before.restaurantId,
      );
      await this.notifications.notifyUsers(followers, {
        type: 'new_promo',
        title: `New deal at ${before.restaurant.name}`,
        body: before.title,
        promotionId: id,
      });
    }
  }

  async deletePromotion(id: string) {
    await this.prisma.promotion.delete({ where: { id } });
    await this.audit('promotion.delete', 'Promotion', id);
  }

  async auditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }
}

/** Great-circle distance between two coordinates, in kilometres. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
