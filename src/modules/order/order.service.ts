import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AccountService } from '../account/account.service.js';
import { AccountStatus } from '../account/types/account-status.js';
import { StoreService } from '../store/store.service.js';
import { ORDER_REPOSITORY } from './order.constants.js';
import type { OrderRepositoryInterface } from './order.repository.interface.js';
import type { OrderLineInput } from './order.types.js';

@Injectable()
export class OrderService {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepositoryInterface,
    private readonly accounts: AccountService, private readonly stores: StoreService) {}
  async create(accountId: string, storeId: string, lines: OrderLineInput[]) {
    const account = await this.accounts.findById(accountId).catch(() => null);
    if (!account || account.status !== AccountStatus.ACTIVE) throw new UnauthorizedException();
    await this.stores.publicStore(storeId);
    if (!lines.length || lines.length > 100 || lines.some(line => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000)) {
      throw new BadRequestException('Invalid order items');
    }
    const order = await this.orders.create(accountId, storeId, lines);
    if (!order) throw new ConflictException('Order items unavailable or total too large');
    return order;
  }
  async buyerRead(accountId: string, id: string) {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.accountId !== accountId) throw new ForbiddenException('Order ownership required');
    return order;
  }
  buyerList(accountId: string) { return this.orders.findByAccount(accountId); }
  async sellerRead(accountId: string, storeId: string, id: string) {
    await this.stores.requireOwner(accountId, storeId);
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.storeId !== storeId) throw new ForbiddenException('Order belongs to another store');
    return order;
  }
}
