import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/typeorm/typeorm.module.js';
import { AccountModule } from './modules/account/account.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AccountHttpModule } from './modules/account-http/account-http.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';
import { StoreModule } from './modules/store/store.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { OrderModule } from './modules/order/order.module.js';

@Module({
  imports: [AppConfigModule, DatabaseModule, AccountModule, AuthModule, AccountHttpModule, ProfileModule, StoreModule, CatalogModule, InventoryModule, OrderModule],
  controllers: [AppController]
})
export class AppModule {}
