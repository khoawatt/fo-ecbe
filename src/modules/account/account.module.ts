import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../../database/entities/account.entity.js';
import { ACCOUNT_REPOSITORY } from './account.constants.js';
import { AccountRepository } from './account.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity])],
  providers: [
    AccountRepository,
    {
      provide: ACCOUNT_REPOSITORY,
      useExisting: AccountRepository
    }
  ]
})
export class AccountModule {}
