import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AccountService } from '../account/account.service.js';
import { StoreService } from '../store/store.service.js';
import { OrderService } from './order.service.js';
import type { OrderRepositoryInterface } from './order.repository.interface.js';

describe('OrderService account ownership', () => {
  it('prevents an authenticated account from reading another buyer order', async () => {
    const order = { id: 'order', accountId: 'buyer-a', storeId: 'store', status: 'CREATED', totalCents: 100,
      createdAt: new Date(), updatedAt: new Date(), items: [] };
    const service = new OrderService({ findById: async () => order } as unknown as OrderRepositoryInterface,
      {} as AccountService, {} as StoreService);
    await expect(service.buyerRead('buyer-b', 'order')).rejects.toThrow(ForbiddenException);
  });
});
