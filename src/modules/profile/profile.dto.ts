import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CustomerProfileCreateDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;
  @IsOptional() @IsUrl() @MaxLength(2048)
  avatarUrl?: string | null;
  @IsOptional() @IsDateString()
  dateOfBirth?: string | null;
}

export class CustomerProfileUpdateDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  firstName?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  lastName?: string;
  @IsOptional() @IsUrl() @MaxLength(2048)
  avatarUrl?: string | null;
  @IsOptional() @IsDateString()
  dateOfBirth?: string | null;
}

export class SellerApplicationDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  displayName!: string;
}
