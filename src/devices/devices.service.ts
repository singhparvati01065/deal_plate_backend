import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Register (or re-assign) an FCM device token for the current user. */
  async register(uid: string, dto: RegisterDeviceDto) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
    });
    if (!user) throw new NotFoundException('User not found');

    // Token is globally unique — upsert so a token always points at the
    // latest user/platform (e.g. after re-login on the same device).
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: {
        token: dto.token,
        platform: dto.platform,
        userId: user.id,
      },
      update: {
        userId: user.id,
        platform: dto.platform,
      },
    });
    return { ok: true };
  }

  /** Remove a token (e.g. on sign-out). */
  async unregister(token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
    return { ok: true };
  }
}
