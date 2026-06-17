import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { StaffService } from './staff.service';
import { AddStaffDto } from './dto/add-staff.dto';

@Controller('staff')
@UseGuards(FirebaseAuthGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  listMine(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.staff.listMine(fb.uid);
  }

  @Post()
  add(@CurrentFirebaseUser() fb: FirebaseUser, @Body() dto: AddStaffDto) {
    return this.staff.add(fb.uid, dto);
  }
}
