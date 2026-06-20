import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(FirebaseAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** Owner: extract promotion fields from an uploaded flyer image. */
  @Post('scan-flyer')
  scanFlyer(@Body('imageUrl') imageUrl: string) {
    return this.ai.scanFlyer(imageUrl);
  }
}
