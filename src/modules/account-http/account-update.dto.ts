import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class AccountUpdateDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}

export class AdminAccountUpdateDto extends AccountUpdateDto {}
