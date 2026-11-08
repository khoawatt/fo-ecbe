import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryEntity } from '../../database/entities/inventory.entity.js';
import type { InventoryRepositoryInterface } from './inventory.repository.interface.js';
import type { InventoryRecord } from './inventory.types.js';

@Injectable()
export class InventoryRepository implements InventoryRepositoryInterface {
  constructor(@InjectRepository(InventoryEntity) private readonly inventories: Repository<InventoryEntity>) {}
  private record(i: InventoryEntity): InventoryRecord {
    const { id, storeId, productVariantId, quantity, createdAt, updatedAt } = i;
    return { id, storeId, productVariantId, quantity, createdAt, updatedAt };
  }
  async find(storeId: string, variantId: string): Promise<InventoryRecord | null> {
    const row = await this.inventories.findOneBy({ storeId, productVariantId: variantId });
    return row ? this.record(row) : null;
  }
  async create(storeId: string, variantId: string, quantity: number): Promise<InventoryRecord> {
    const row = await this.inventories.save(this.inventories.create({ storeId, productVariantId: variantId, quantity }));
    return this.record(row);
  }
  async adjust(storeId: string, variantId: string, delta: number): Promise<InventoryRecord | null> {
    const result = await this.inventories.createQueryBuilder().update(InventoryEntity)
      .set({ quantity: () => 'quantity + :delta', updatedAt: () => 'now()' })
      .where('store_id = :storeId AND product_variant_id = :variantId', { storeId, variantId })
      .andWhere('quantity + :delta >= 0 AND quantity + :delta <= 2147483647', { delta })
      .execute();
    return result.affected === 1 ? this.find(storeId, variantId) : null;
  }
}
