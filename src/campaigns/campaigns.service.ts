import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
    private readonly firebase: FirebaseService,
  ) {}

  async mine(uid: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    return this.prisma.pushCampaign.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Send a push campaign: resolve the target audience's device tokens,
   * deliver via FCM, prune stale tokens, and record the campaign.
   */
  async create(uid: string, dto: CreateCampaignDto) {
    const restaurant = await this.restaurants.requireOwned(uid);
    const audience = dto.audience ?? 'all';
    const tokens = await this.audienceTokens(restaurant, audience);

    let recipients = tokens.length;
    try {
      const { successCount, staleTokens } = await this.firebase.sendPush(
        tokens,
        { title: dto.title, body: dto.message },
        { type: 'campaign', restaurantId: restaurant.id },
      );
      recipients = successCount;
      if (staleTokens.length) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: staleTokens } },
        });
      }
    } catch (e) {
      // Don't fail the request if delivery breaks — still record the campaign.
      this.logger.error(`Push delivery failed: ${(e as Error).message}`);
    }

    return this.prisma.pushCampaign.create({
      data: {
        restaurantId: restaurant.id,
        title: dto.title,
        message: dto.message,
        audience,
        recipients,
      },
    });
  }

  /** Device tokens for the chosen audience. */
  private async audienceTokens(
    restaurant: { id: string; latitude: number | null; longitude: number | null },
    audience: string,
  ): Promise<string[]> {
    let userIds: string[] | undefined;

    if (audience === 'favorites') {
      const favs = await this.prisma.favorite.findMany({
        where: { promotion: { restaurantId: restaurant.id } },
        select: { userId: true },
        distinct: ['userId'],
      });
      userIds = favs.map((f) => f.userId);
      if (!userIds.length) return [];
    } else if (audience === 'nearby') {
      // Users whose last known location is within 15 km of the restaurant.
      if (restaurant.latitude == null || restaurant.longitude == null) {
        return [];
      }
      const users = await this.prisma.user.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { id: true, latitude: true, longitude: true },
      });
      userIds = users
        .filter(
          (u) =>
            haversineKm(
              restaurant.latitude!,
              restaurant.longitude!,
              u.latitude!,
              u.longitude!,
            ) <= 15,
        )
        .map((u) => u.id);
      if (!userIds.length) return [];
    }
    // 'all' targets every registered device.

    const devices = await this.prisma.deviceToken.findMany({
      where: userIds ? { userId: { in: userIds } } : {},
      select: { token: true },
    });
    return [...new Set(devices.map((d) => d.token))];
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
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
