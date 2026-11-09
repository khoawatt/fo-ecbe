import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../../database/entities/product.entity.js';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { StoreModule } from '../store/store.module.js';
import { CATALOG_REPOSITORY } from './catalog.constants.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, ProductVariantEntity]), StoreModule, AuthModule, AuthorizationModule],
  providers: [CatalogRepository, { provide: CATALOG_REPOSITORY, useExisting: CatalogRepository }, CatalogService],
  controllers: [CatalogController], exports: [CatalogService]
})
export class CatalogModule {}
