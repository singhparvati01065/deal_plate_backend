import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/** Notifies followers about deals ending within 24h (once per deal). */
@Injectable()
export class ExpiringDealsTask {
  private readonly logger = new Logger(ExpiringDealsTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleCron() {
    const { processed } = await this.run();
    if (processed) this.logger.log(`Expiring-deal alerts sent for ${processed} deals.`);
  }

  /** Exposed so it can be triggered manually (and unit-tested). */
  async run() {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const promos = await this.prisma.promotion.findMany({
      where: {
        status: 'APPROVED',
        expiringNotified: false,
        endDate: { gt: now, lte: soon },
      },
      include: { restaurant: true },
    });

    for (const p of promos) {
      const followers = await this.notifications.restaurantFollowerIds(
        p.restaurantId,
      );
      await this.notifications.notifyUsers(followers, {
        type: 'expiring',
        title: `Ending soon: ${p.title}`,
        body: `Catch this deal at ${p.restaurant.name} before it ends.`,
        promotionId: p.id,
      });
      await this.prisma.promotion.update({
        where: { id: p.id },
        data: { expiringNotified: true },
      });
    }
    return { processed: promos.length };
  }
}
