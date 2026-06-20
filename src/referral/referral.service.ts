import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

export const POINTS_PER_REFERRAL = 50;

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
  ) {}

  private async newCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 6; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const clash = await this.prisma.user.findFirst({
        where: { referralCode: code },
      });
      if (!clash) return code;
    }
    throw new ConflictException('Could not generate a code, try again.');
  }

  async myReferral(uid: string) {
    let user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.referralCode) {
      const code = await this.newCode();
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { referralCode: code },
      });
    }
    const referredCount = await this.prisma.referral.count({
      where: { referrerId: user.id },
    });
    return {
      code: user.referralCode,
      referredCount,
      pointsPerReferral: POINTS_PER_REFERRAL,
    };
  }

  /** Apply a friend's referral code (once per user). Awards both sides. */
  async apply(uid: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');

    const already = await this.prisma.referral.findUnique({
      where: { referredUserId: user.id },
    });
    if (already) {
      throw new ConflictException('You have already used a referral code.');
    }

    const referrer = await this.prisma.user.findFirst({
      where: { referralCode: (code ?? '').trim().toUpperCase() },
    });
    if (!referrer) throw new NotFoundException('Invalid referral code.');
    if (referrer.id === user.id) {
      throw new BadRequestException("You can't use your own code.");
    }

    await this.prisma.referral.create({
      data: { referrerId: referrer.id, referredUserId: user.id },
    });
    await this.loyalty
      .award(referrer.id, POINTS_PER_REFERRAL, 'referral', user.id)
      .catch(() => undefined);
    await this.loyalty
      .award(user.id, POINTS_PER_REFERRAL, 'referral_bonus', referrer.id)
      .catch(() => undefined);

    return { ok: true, points: POINTS_PER_REFERRAL };
  }
}
