import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service.js';
import { StoreService } from '../store/store.service.js';
import { INVENTORY_REPOSITORY } from './inventory.constants.js';
import type { InventoryRepositoryInterface } from './inventory.repository.interface.js';

@Injectable()
export class InventoryService {
  constructor(@Inject(INVENTORY_REPOSITORY) private readonly inventory: InventoryRepositoryInterface,
    private readonly catalog: CatalogService, private readonly stores: StoreService) {}
  private async authorize(accountId: string, storeId: string, variantId: string) {
    await this.stores.requireOwner(accountId, storeId);
    const { product } = await this.catalog.requireVariantOwner(accountId, variantId);
    if (product.storeId !== storeId) throw new NotFoundException('Variant does not belong to store');
  }
  async create(accountId: string, storeId: string, variantId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) throw new BadRequestException('Invalid quantity');
    await this.authorize(accountId, storeId, variantId);
    try { return await this.inventory.create(storeId, variantId, quantity); }
    catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new ConflictException('Inventory exists');
      throw error;
    }
  }
  async get(accountId: string, storeId: string, variantId: string) {
    await this.authorize(accountId, storeId, variantId);
    const row = await this.inventory.find(storeId, variantId);
    if (!row) throw new NotFoundException('Inventory not found');
    return row;
  }
  async adjust(accountId: string, storeId: string, variantId: string, delta: number) {
    if (!Number.isInteger(delta) || Math.abs(delta) > 2147483647) throw new BadRequestException('Invalid adjustment');
    await this.authorize(accountId, storeId, variantId);
    const row = await this.inventory.adjust(storeId, variantId, delta);
    if (!row) {
      if (!await this.inventory.find(storeId, variantId)) throw new NotFoundException('Inventory not found');
      throw new ConflictException('Insufficient stock or quantity limit');
    }
    return row;
  }
}
