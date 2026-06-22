import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async userId(uid: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  /** Public: a restaurant's reviews, newest first, with author info. */
  async listForRestaurant(restaurantId: string) {
    return this.prisma.review.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, photoUrl: true } },
      },
      take: 200,
    });
  }

  /** Admin: every review across the platform, newest first. */
  async listAll() {
    return this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        restaurant: { select: { name: true } },
      },
      take: 500,
    });
  }

  /** Admin: remove any review (moderation), then refresh the average. */
  async adminRemove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id } });
    await this.recalc(review.restaurantId);
    return { deleted: true };
  }

  /** Consumer: their own review for a restaurant (to pre-fill the form). */
  async mine(uid: string, restaurantId: string) {
    const userId = await this.userId(uid);
    return this.prisma.review.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
  }

  /** Consumer: create or update their review, then refresh the average. */
  async submit(uid: string, dto: CreateReviewDto) {
    const userId = await this.userId(uid);
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const comment = dto.comment?.trim() || null;
    const existing = await this.prisma.review.findUnique({
      where: { userId_restaurantId: { userId, restaurantId: dto.restaurantId } },
    });

    const review = await this.prisma.review.upsert({
      where: {
        userId_restaurantId: { userId, restaurantId: dto.restaurantId },
      },
      create: {
        userId,
        restaurantId: dto.restaurantId,
        rating: dto.rating,
        comment,
      },
      update: { rating: dto.rating, comment },
    });

    await this.recalc(dto.restaurantId);

    // Notify the owner only on brand-new reviews (not silent edits).
    if (!existing) {
      const reviewer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await this.notifications.notifyUsers([restaurant.ownerId], {
        type: 'review',
        title: `New ${dto.rating}★ review`,
        body: `${reviewer?.name || 'A customer'} reviewed ${restaurant.name}`,
      });
    }

    return review;
  }

  /** Consumer: delete their own review, then refresh the average. */
  async remove(uid: string, restaurantId: string) {
    const userId = await this.userId(uid);
    await this.prisma.review
      .delete({
        where: { userId_restaurantId: { userId, restaurantId } },
      })
      .catch(() => undefined);
    await this.recalc(restaurantId);
    return { deleted: true };
  }

  /** Recompute the restaurant's cached average rating and review count. */
  private async recalc(restaurantId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { restaurantId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    });
  }
}
