import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { StoreStatus } from '../../database/entities/store.entity.js';
export class CreateStoreDto {
  @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(160) slug!: string;
}
export class UpdateStoreDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(160) slug?: string;
  @IsOptional() @IsEnum(StoreStatus) status?: StoreStatus;
}
