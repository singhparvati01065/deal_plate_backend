import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
@UseGuards(FirebaseAuthGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  register(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.devices.register(fb.uid, dto);
  }

  @Delete(':token')
  unregister(@Param('token') token: string) {
    return this.devices.unregister(token);
  }
}
