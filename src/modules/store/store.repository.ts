import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreEntity } from '../../database/entities/store.entity.js';
import type { StoreRepositoryInterface } from './store.repository.interface.js';
import type { StoreInput, StoreRecord } from './store.types.js';

@Injectable()
export class StoreRepository implements StoreRepositoryInterface {
  constructor(@InjectRepository(StoreEntity) private readonly stores: Repository<StoreEntity>) {}
  private record(s: StoreEntity): StoreRecord {
    const { id, sellerProfileId, name, slug, status, createdAt, updatedAt } = s;
    return { id, sellerProfileId, name, slug, status, createdAt, updatedAt };
  }
  async create(sellerProfileId: string, input: StoreInput): Promise<StoreRecord> {
    return this.record(await this.stores.save(this.stores.create({ sellerProfileId, ...input })));
  }
  async findById(id: string): Promise<StoreRecord | null> {
    const entity = await this.stores.findOneBy({ id });
    return entity ? this.record(entity) : null;
  }
  async update(id: string, data: Partial<StoreInput> & { status?: StoreRecord['status'] }): Promise<StoreRecord> {
    await this.stores.update(id, data);
    return this.record(await this.stores.findOneByOrFail({ id }));
  }
  async findBySeller(sellerProfileId: string): Promise<StoreRecord[]> {
    return (await this.stores.find({ where: { sellerProfileId }, order: { createdAt: 'ASC', id: 'ASC' } })).map(s => this.record(s));
  }
}
