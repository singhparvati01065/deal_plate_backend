import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

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

    const [
      totalUsers,
      newUsers,
      activeDevices,
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

    // Geographic trends: users grouped by city is not stored, so use
    // restaurants' cities as the coverage map.
    const byCity = await this.prisma.restaurant.groupBy({
      by: ['city'],
      _count: { _all: true },
      orderBy: { _count: { city: 'desc' } },
      take: 10,
    });

    return {
      totalUsers,
      newUsers,
      activeDevices,
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
