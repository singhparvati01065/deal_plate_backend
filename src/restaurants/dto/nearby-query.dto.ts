import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsPositive } from 'class-validator';

export class NearbyQueryDto {
  @Type(() => Number) @IsLatitude() lat: number;
  @Type(() => Number) @IsLongitude() lng: number;
  @IsOptional() @Type(() => Number) @IsPositive() radiusKm?: number;
}
