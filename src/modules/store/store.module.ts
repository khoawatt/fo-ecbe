import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreEntity } from '../../database/entities/store.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AccountModule } from '../account/account.module.js';
import { ProfileModule } from '../profile/profile.module.js';
import { STORE_REPOSITORY } from './store.constants.js';
import { StoreController } from './store.controller.js';
import { StoreRepository } from './store.repository.js';
import { StoreService } from './store.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([StoreEntity]), ProfileModule, AuthModule, AuthorizationModule, AccountModule],
  providers: [StoreRepository, { provide: STORE_REPOSITORY, useExisting: StoreRepository }, StoreService],
  controllers: [StoreController], exports: [StoreService]
})
export class StoreModule {}
