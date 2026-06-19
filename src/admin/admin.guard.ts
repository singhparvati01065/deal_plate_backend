import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Guards admin pages behind the session login. Redirects to /admin/login
 * instead of throwing, so the browser experience is clean.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const loggedIn = (req.session as { admin?: boolean })?.admin === true;
    if (!loggedIn) {
      res.redirect('/admin/login');
      return false;
    }
    return true;
  }
}
