import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  private async userId(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  /** The promotions this user has saved (with restaurant). */
  async listMine(uid: string) {
    const userId = await this.userId(uid);
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        promotion: {
          include: {
            restaurant: true,
            _count: { select: { favorites: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return favs.map((f) => f.promotion);
  }

  /** Saved promotion ids (for hydrating the UI heart state). */
  async myIds(uid: string) {
    const userId = await this.userId(uid);
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      select: { promotionId: true },
    });
    return favs.map((f) => f.promotionId);
  }

  async toggle(uid: string, promotionId: string) {
    const userId = await this.userId(uid);
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_promotionId: { userId, promotionId } },
    });
    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.favorite.create({ data: { userId, promotionId } });
    return { favorited: true };
  }
}
