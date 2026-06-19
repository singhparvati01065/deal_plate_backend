import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

type AdminSession = Request['session'] & { admin?: boolean };

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ---- Auth ----
  @Get('login')
  loginPage(@Req() req: Request, @Res() res: Response) {
    if ((req.session as AdminSession).admin) return res.redirect('/admin');
    return res.render('admin/login', { layout: false, error: null });
  }

  @Post('login')
  login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (this.admin.verifyCredentials(email, password)) {
      (req.session as AdminSession).admin = true;
      return res.redirect('/admin');
    }
    return res.render('admin/login', {
      layout: false,
      error: 'Invalid email or password',
    });
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => res.redirect('/admin/login'));
  }

  // ---- Pages (guarded) ----
  @Get()
  @UseGuards(AdminGuard)
  async dashboard(@Res() res: Response) {
    const stats = await this.admin.dashboard();
    return res.render('admin/dashboard', { nav: 'dashboard', stats });
  }

  @Get('users')
  @UseGuards(AdminGuard)
  async users(@Res() res: Response) {
    const users = await this.admin.users();
    return res.render('admin/users', { nav: 'users', users });
  }

  @Post('users/:id/delete')
  @UseGuards(AdminGuard)
  async deleteUser(@Param('id') id: string, @Res() res: Response) {
    await this.admin.deleteUser(id);
    return res.redirect('/admin/users');
  }

  @Get('restaurants')
  @UseGuards(AdminGuard)
  async restaurants(@Res() res: Response) {
    const restaurants = await this.admin.restaurants();
    return res.render('admin/restaurants', {
      nav: 'restaurants',
      restaurants,
    });
  }

  @Get('promotions')
  @UseGuards(AdminGuard)
  async promotions(@Query('status') status: string, @Res() res: Response) {
    const promotions = await this.admin.promotions(status || undefined);
    return res.render('admin/promotions', {
      nav: 'promotions',
      promotions,
      status: status || 'ALL',
    });
  }

  @Post('promotions/:id/approve')
  @UseGuards(AdminGuard)
  async approve(@Param('id') id: string, @Res() res: Response) {
    await this.admin.setPromotionStatus(id, 'APPROVED');
    return res.redirect('/admin/promotions');
  }

  @Post('promotions/:id/reject')
  @UseGuards(AdminGuard)
  async reject(@Param('id') id: string, @Res() res: Response) {
    await this.admin.setPromotionStatus(id, 'REJECTED');
    return res.redirect('/admin/promotions');
  }

  @Post('promotions/:id/delete')
  @UseGuards(AdminGuard)
  async deletePromotion(@Param('id') id: string, @Res() res: Response) {
    await this.admin.deletePromotion(id);
    return res.redirect('/admin/promotions');
  }

  @Get('audit')
  @UseGuards(AdminGuard)
  async audit(@Res() res: Response) {
    const logs = await this.admin.auditLogs();
    return res.render('admin/audit', { nav: 'audit', logs });
  }
}
