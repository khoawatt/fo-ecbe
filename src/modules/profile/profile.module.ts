import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerProfileEntity } from '../../database/entities/customer-profile.entity.js';
import { SellerProfileEntity } from '../../database/entities/seller-profile.entity.js';
import { AccountModule } from '../account/account.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PROFILE_REPOSITORY } from './profile.constants.js';
import { CustomerProfileController, SellerProfileController } from './profile.controller.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerProfileEntity, SellerProfileEntity]), AccountModule, AuthModule, AuthorizationModule],
  providers: [ProfileRepository, { provide: PROFILE_REPOSITORY, useExisting: ProfileRepository }, ProfileService],
  controllers: [CustomerProfileController, SellerProfileController],
  exports: [ProfileService]
})
export class ProfileModule {}
