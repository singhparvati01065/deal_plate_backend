import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { CateringService } from './catering.service';

@Controller('catering')
export class CateringController {
  constructor(private readonly catering: CateringService) {}

  // ---- Public ----
  @Get('restaurant/:id/packages')
  restaurantPackages(@Param('id') id: string) {
    return this.catering.restaurantPackages(id);
  }

  // ---- Owner: packages ----
  @Post('packages')
  @UseGuards(FirebaseAuthGuard)
  addPackage(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catering.addPackage(fb.uid, body as never);
  }

  @Get('owner/packages')
  @UseGuards(FirebaseAuthGuard)
  myPackages(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.catering.myPackages(fb.uid);
  }

  @Delete('packages/:id')
  @UseGuards(FirebaseAuthGuard)
  deletePackage(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.catering.deletePackage(fb.uid, id);
  }

  // ---- Consumer: requests ----
  @Post('requests')
  @UseGuards(FirebaseAuthGuard)
  createRequest(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catering.createRequest(fb.uid, body as never);
  }

  @Get('my-requests')
  @UseGuards(FirebaseAuthGuard)
  myRequests(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.catering.myRequests(fb.uid);
  }

  // ---- Owner: requests ----
  @Get('owner/requests')
  @UseGuards(FirebaseAuthGuard)
  ownerRequests(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.catering.ownerRequests(fb.uid);
  }

  @Patch('requests/:id')
  @UseGuards(FirebaseAuthGuard)
  setStatus(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.catering.setRequestStatus(fb.uid, id, status);
  }
}
