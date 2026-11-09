import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryEntity } from '../../database/entities/inventory.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { StoreModule } from '../store/store.module.js';
import { INVENTORY_REPOSITORY } from './inventory.constants.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryEntity]), CatalogModule, StoreModule, AuthModule, AuthorizationModule],
  providers: [InventoryRepository, { provide: INVENTORY_REPOSITORY, useExisting: InventoryRepository }, InventoryService],
  controllers: [InventoryController], exports: [InventoryService]
})
export class InventoryModule {}
