import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';

interface PackageInput {
  name: string;
  description?: string;
  pricePerPerson?: number;
  minGuests?: number;
  imageUrl?: string;
}

interface RequestInput {
  restaurantId: string;
  packageId?: string;
  eventDate: string;
  guests: number;
  message?: string;
  contactPhone?: string;
}

@Injectable()
export class CateringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
  ) {}

  // ---- Owner: packages ----
  async addPackage(uid: string, dto: PackageInput) {
    const restaurant = await this.restaurants.requireOwned(uid);
    return this.prisma.cateringPackage.create({
      data: {
        restaurantId: restaurant.id,
        name: dto.name,
        description: dto.description,
        pricePerPerson:
          dto.pricePerPerson != null ? Number(dto.pricePerPerson) : null,
        minGuests: dto.minGuests != null ? Number(dto.minGuests) : null,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async myPackages(uid: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    return this.prisma.cateringPackage.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deletePackage(uid: string, id: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    const pkg = await this.prisma.cateringPackage.findUnique({ where: { id } });
    if (!pkg || pkg.restaurantId !== restaurant.id) {
      throw new NotFoundException('Package not found');
    }
    await this.prisma.cateringPackage.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Public ----
  async restaurantPackages(restaurantId: string) {
    return this.prisma.cateringPackage.findMany({
      where: { restaurantId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- Consumer: requests ----
  async createRequest(uid: string, dto: RequestInput) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.cateringRequest.create({
      data: {
        userId: user.id,
        restaurantId: dto.restaurantId,
        packageId: dto.packageId || null,
        eventDate: new Date(dto.eventDate),
        guests: Number(dto.guests),
        message: dto.message,
        contactPhone: dto.contactPhone,
      },
    });
  }

  async myRequests(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.cateringRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: { select: { name: true } },
        package: { select: { name: true } },
      },
    });
  }

  // ---- Owner: requests ----
  async ownerRequests(uid: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    return this.prisma.cateringRequest.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        package: { select: { name: true } },
      },
    });
  }

  async setRequestStatus(uid: string, id: string, status: string) {
    const restaurant = await this.restaurants.requireOwned(uid);
    const req = await this.prisma.cateringRequest.findUnique({ where: { id } });
    if (!req || req.restaurantId !== restaurant.id) {
      throw new NotFoundException('Request not found');
    }
    if (!['PENDING', 'RESPONDED', 'CLOSED'].includes(status)) {
      throw new ForbiddenException('Invalid status');
    }
    await this.prisma.cateringRequest.update({
      where: { id },
      data: { status },
    });
    return { ok: true };
  }
}
