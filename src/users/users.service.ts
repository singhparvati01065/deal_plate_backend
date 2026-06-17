import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseUser } from '../auth/firebase-user.decorator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = { restaurant: true } as const;

  /**
   * Find the user by Firebase UID, or create them on first login.
   * Returns the user with their restaurant (if any).
   */
  async syncFromFirebase(fb: FirebaseUser) {
    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: fb.uid },
      include: this.include,
    });
    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        firebaseUid: fb.uid,
        email: fb.email ?? `${fb.uid}@no-email.local`,
        name: fb.name,
        photoUrl: fb.picture,
      },
      include: this.include,
    });
  }

  async findByUid(uid: string) {
    return this.prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: this.include,
    });
  }

  async updateProfile(
    uid: string,
    data: { name?: string; photoUrl?: string },
  ) {
    return this.prisma.user.update({
      where: { firebaseUid: uid },
      data: {
        name: data.name,
        photoUrl: data.photoUrl,
      },
      include: this.include,
    });
  }

  async setRole(uid: string, role: Role) {
    return this.prisma.user.update({
      where: { firebaseUid: uid },
      data: { role },
      include: this.include,
    });
  }

  /** Store the user's last known location (for geo-targeted alerts). */
  async setLocation(uid: string, latitude: number, longitude: number) {
    await this.prisma.user.update({
      where: { firebaseUid: uid },
      data: { latitude, longitude },
    });
    return { ok: true };
  }
}
