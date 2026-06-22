import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  /** Public: list subscription plans (owner app pricing screen). */
  @Get()
  list() {
    return this.plans.list();
  }
}
