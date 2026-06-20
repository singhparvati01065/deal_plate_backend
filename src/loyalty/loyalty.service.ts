import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const POINTS_PER_REDEMPTION = 10;

const TIERS = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 100 },
  { name: 'Gold', min: 300 },
  { name: 'Platinum', min: 750 },
];

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Award points to a user (by DB user id). Best-effort. */
  async award(userId: string, points: number, reason: string, refId?: string) {
    await this.prisma.loyaltyEvent.create({
      data: { userId, points, reason, refId },
    });
  }

  async summary(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');

    const agg = await this.prisma.loyaltyEvent.aggregate({
      where: { userId: user.id },
      _sum: { points: true },
    });
    const points = agg._sum.points ?? 0;

    const history = await this.prisma.loyaltyEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Current tier = highest tier whose threshold is met.
    let tierIdx = 0;
    for (let i = 0; i < TIERS.length; i++) {
      if (points >= TIERS[i].min) tierIdx = i;
    }
    const tier = TIERS[tierIdx];
    const next = TIERS[tierIdx + 1] ?? null;

    return {
      points,
      tier: tier.name,
      nextTier: next?.name ?? null,
      pointsToNext: next ? Math.max(0, next.min - points) : 0,
      pointsPerRedemption: POINTS_PER_REDEMPTION,
      history,
    };
  }
}
