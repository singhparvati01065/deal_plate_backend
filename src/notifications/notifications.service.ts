import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

export interface NotifyPayload {
  type: string; // new_promo | favorite | expiring | geo | campaign
  title: string;
  body: string;
  promotionId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  /**
   * Persist an in-app notification for each user AND push it to their devices.
   * Best-effort: a delivery failure never throws to the caller.
   */
  async notifyUsers(userIds: string[], payload: NotifyPayload): Promise<number> {
    const ids = [...new Set(userIds)];
    if (!ids.length) return 0;

    await this.prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        promotionId: payload.promotionId,
      })),
    });

    try {
      const devices = await this.prisma.deviceToken.findMany({
        where: { userId: { in: ids } },
        select: { token: true },
      });
      const tokens = [...new Set(devices.map((d) => d.token))];
      const { staleTokens } = await this.firebase.sendPush(
        tokens,
        { title: payload.title, body: payload.body },
        {
          type: payload.type,
          if: payload.promotionId ? 'promotion' : 'none',
          promotionId: payload.promotionId ?? '',
        },
      );
      if (staleTokens.length) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: staleTokens } },
        });
      }
    } catch (e) {
      this.logger.error(`Push delivery failed: ${(e as Error).message}`);
    }
    return ids.length;
  }

  /** Users who have favorited any promotion of a restaurant (its "fans"). */
  async restaurantFollowerIds(restaurantId: string): Promise<string[]> {
    const favs = await this.prisma.favorite.findMany({
      where: { promotion: { restaurantId } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return favs.map((f) => f.userId);
  }

  async listMine(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markAllRead(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
