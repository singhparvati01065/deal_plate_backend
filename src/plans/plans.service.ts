import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Seeded defaults — only created if the plan key doesn't exist yet. */
const DEFAULT_PLANS = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 0,
    period: 'free',
    description: 'Get started for free',
    features: [
      '2 active promotions',
      'Basic restaurant profile',
      'Appears in local search',
    ],
    promoLimit: 2,
    popular: false,
    order: 1,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 49,
    period: 'per month',
    description: 'For growing restaurants',
    features: [
      '15 active promotions',
      'Push notification campaigns',
      'Analytics dashboard',
      '3 staff accounts',
    ],
    promoLimit: 15,
    popular: true,
    order: 2,
  },
  {
    key: 'PREMIUM',
    name: 'Premium',
    price: 99,
    period: 'per month',
    description: 'Everything, unlimited',
    features: [
      'Unlimited promotions',
      'Geo-targeted push',
      'Priority placement',
      'Unlimited staff accounts',
      'Dedicated support',
    ],
    promoLimit: 9999,
    popular: false,
    order: 3,
  },
];

export interface UpdatePlanData {
  name?: string;
  price?: number;
  period?: string;
  description?: string;
  features?: string[];
  promoLimit?: number;
  popular?: boolean;
}

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureSeed().catch(() => undefined);
  }

  /** Create any missing default plans (idempotent). */
  async ensureSeed() {
    for (const p of DEFAULT_PLANS) {
      const existing = await this.prisma.plan.findUnique({
        where: { key: p.key },
      });
      if (!existing) await this.prisma.plan.create({ data: p });
    }
  }

  /** Public: ordered plan list (for the owner subscription screen). */
  list() {
    return this.prisma.plan.findMany({ orderBy: { order: 'asc' } });
  }

  getByKey(key: string) {
    return this.prisma.plan.findUnique({ where: { key } });
  }

  /** Admin: edit a plan's rate / description / features / limit. */
  async update(id: string, data: UpdatePlanData) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.plan.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price,
        period: data.period,
        description: data.description,
        features: data.features,
        promoLimit: data.promoLimit,
        popular: data.popular,
      },
    });
  }
}
