import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StaffRole } from '@prisma/client';

export class AddStaffDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsEnum(StaffRole) role?: StaffRole;
}
