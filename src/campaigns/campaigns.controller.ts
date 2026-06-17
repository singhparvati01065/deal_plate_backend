import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Controller('campaigns')
@UseGuards(FirebaseAuthGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  mine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.campaigns.mine(fb.uid);
  }

  @Post()
  create(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaigns.create(fb.uid, dto);
  }
}
