import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountModule } from '../account/account.module.js';
import { StoreModule } from '../store/store.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { ORDER_REPOSITORY } from './order.constants.js';
import { OrderController } from './order.controller.js';
import { OrderRepository } from './order.repository.js';
import { OrderService } from './order.service.js';

@Module({
  imports: [AuthModule, AccountModule, StoreModule, AuthorizationModule],
  providers: [OrderRepository, { provide: ORDER_REPOSITORY, useExisting: OrderRepository }, OrderService],
  controllers: [OrderController]
})
export class OrderModule {}
