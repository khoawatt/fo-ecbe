import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../../database/entities/account.entity.js';
import { ACCOUNT_REPOSITORY } from './account.constants.js';
import { AccountRepository } from './account.repository.js';
import { AccountService } from './account.service.js';
import { PasswordHashingService } from './password-hashing.service.js';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([AccountEntity])],
  providers: [
    AccountRepository,
    PasswordHashingService,
    AccountService,
    {
      provide: ACCOUNT_REPOSITORY,
      useExisting: AccountRepository
    }
  ],
  exports: [AccountService]
})
export class AccountModule {}
