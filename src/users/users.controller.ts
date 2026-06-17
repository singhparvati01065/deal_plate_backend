import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentFirebaseUser,
  FirebaseUser,
} from '../auth/firebase-user.decorator';
import { UsersService } from './users.service';
import { SetRoleDto } from './dto/set-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Called right after Firebase login: creates the user if new. */
  @Post('auth/sync')
  sync(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.users.syncFromFirebase(fb);
  }

  /** Logged-in user's profile + role + business. */
  @Get('users/me')
  me(@CurrentFirebaseUser() fb: FirebaseUser) {
    return this.users.findByUid(fb.uid);
  }

  /** Update profile (name, photo). */
  @Patch('users/me')
  updateProfile(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(fb.uid, dto);
  }

  /** Choose / update role (USER or OWNER). */
  @Patch('users/me/role')
  setRole(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body() dto: SetRoleDto,
  ) {
    return this.users.setRole(fb.uid, dto.role);
  }

  /** Store the user's last known location (for geo-targeted alerts). */
  @Patch('users/me/location')
  setLocation(
    @CurrentFirebaseUser() fb: FirebaseUser,
    @Body('lat') lat: number,
    @Body('lng') lng: number,
  ) {
    return this.users.setLocation(fb.uid, Number(lat), Number(lng));
  }
}
