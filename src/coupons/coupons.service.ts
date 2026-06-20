import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import {
  LoyaltyService,
  POINTS_PER_REDEMPTION,
} from '../loyalty/loyalty.service';

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
    private readonly loyalty: LoyaltyService,
  ) {}

  private async userId(uid: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /** Consumer claims a coupon for a promotion (idempotent while ACTIVE). */
  async claim(uid: string, promotionId: string) {
    const userId = await this.userId(uid);
    const promo = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    if (promo.status !== 'APPROVED' || promo.endDate < new Date()) {
      throw new BadRequestException('This deal is not available.');
    }

    const existing = await this.prisma.coupon.findFirst({
      where: { userId, promotionId, status: 'ACTIVE' },
    });
    if (existing) return existing;

    // Generate a unique code (retry on the rare collision).
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateCode();
      const clash = await this.prisma.coupon.findUnique({ where: { code } });
      if (clash) continue;
      return this.prisma.coupon.create({
        data: {
          code,
          userId,
          promotionId,
          restaurantId: promo.restaurantId,
        },
      });
    }
    throw new ConflictException('Could not generate a coupon, try again.');
  }

  /** Consumer's coupons, newest first. */
  async mine(uid: string) {
    const userId = await this.userId(uid);
    return this.prisma.coupon.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        promotion: { select: { title: true, badge: true, imageUrl: true } },
        restaurant: { select: { name: true } },
      },
      take: 100,
    });
  }

  /** Owner redeems a coupon by code (at the counter). */
  async redeem(uid: string, code: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: (code ?? '').trim().toUpperCase() },
      include: {
        promotion: { select: { title: true, badge: true } },
        user: { select: { name: true, email: true } },
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon.restaurantId !== restaurant.id) {
      throw new ForbiddenException('This coupon is for a different restaurant.');
    }
    if (coupon.status === 'REDEEMED') {
      throw new ConflictException(
        `Already redeemed on ${coupon.redeemedAt?.toDateString() ?? 'earlier'}.`,
      );
    }
    const updated = await this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { status: 'REDEEMED', redeemedAt: new Date() },
    });

    // Loyalty: reward the customer for the visit.
    await this.loyalty
      .award(coupon.userId, POINTS_PER_REDEMPTION, 'coupon_redeemed', coupon.id)
      .catch(() => undefined);

    return {
      ok: true,
      code: updated.code,
      promotion: coupon.promotion.title,
      badge: coupon.promotion.badge,
      customer: coupon.user.name || coupon.user.email,
      redeemedAt: updated.redeemedAt,
    };
  }
}
