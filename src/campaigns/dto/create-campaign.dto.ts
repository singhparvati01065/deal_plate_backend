import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString() @MinLength(2) @MaxLength(80) title: string;
  @IsString() @MinLength(2) @MaxLength(240) message: string;
  @IsOptional() @IsString() audience?: string; // all | favorites | nearby
}
