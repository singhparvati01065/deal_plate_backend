import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminApiGuard } from './admin-api.guard';

/** JSON API consumed by the dealplateweb (Next.js) admin portal. */
@Controller('admin/api')
export class AdminApiController {
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  login(@Body('email') email: string, @Body('password') password: string) {
    if (!this.admin.verifyCredentials(email, password)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { token: this.admin.issueToken() };
  }

  @Get('dashboard')
  @UseGuards(AdminApiGuard)
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  @UseGuards(AdminApiGuard)
  users() {
    return this.admin.users();
  }

  @Delete('users/:id')
  @UseGuards(AdminApiGuard)
  async deleteUser(@Param('id') id: string) {
    await this.admin.deleteUser(id);
    return { ok: true };
  }

  @Get('restaurants')
  @UseGuards(AdminApiGuard)
  restaurants() {
    return this.admin.restaurants();
  }

  @Post('restaurants/:id/suspend')
  @UseGuards(AdminApiGuard)
  async suspend(@Param('id') id: string, @Body('suspended') suspended: boolean) {
    await this.admin.setRestaurantSuspended(id, suspended !== false);
    return { ok: true };
  }

  @Post('restaurants/:id/plan')
  @UseGuards(AdminApiGuard)
  async setPlan(@Param('id') id: string, @Body('plan') plan: string) {
    await this.admin.setRestaurantPlan(id, plan);
    return { ok: true };
  }

  @Delete('restaurants/:id')
  @UseGuards(AdminApiGuard)
  async deleteRestaurant(@Param('id') id: string) {
    await this.admin.deleteRestaurant(id);
    return { ok: true };
  }

  @Get('promotions')
  @UseGuards(AdminApiGuard)
  promotions(@Query('status') status?: string) {
    return this.admin.promotions(status || undefined);
  }

  @Post('promotions/:id/approve')
  @UseGuards(AdminApiGuard)
  async approve(@Param('id') id: string) {
    await this.admin.setPromotionStatus(id, 'APPROVED');
    return { ok: true };
  }

  @Post('promotions/:id/reject')
  @UseGuards(AdminApiGuard)
  async reject(@Param('id') id: string) {
    await this.admin.setPromotionStatus(id, 'REJECTED');
    return { ok: true };
  }

  @Delete('promotions/:id')
  @UseGuards(AdminApiGuard)
  async deletePromotion(@Param('id') id: string) {
    await this.admin.deletePromotion(id);
    return { ok: true };
  }

  @Get('audit')
  @UseGuards(AdminApiGuard)
  audit() {
    return this.admin.auditLogs();
  }
}
