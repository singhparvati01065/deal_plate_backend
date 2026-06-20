import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export const adminJwtSecret = () =>
  process.env.SESSION_SECRET ?? 'dealplate-admin-dev-secret';

/** Validates the Bearer JWT issued by POST /admin/api/login. */
@Injectable()
export class AdminApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const payload = jwt.verify(token, adminJwtSecret());
      if ((payload as { admin?: boolean }).admin !== true) {
        throw new Error('not admin');
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
