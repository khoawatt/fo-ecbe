import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountSessionEntity } from '../../database/entities/account-session.entity.js';
import { AccountEntity } from '../../database/entities/account.entity.js';
import { AccountStatus } from '../account/types/account-status.js';
import type { AccountSessionRepositoryInterface, SessionMetadata } from './account-session.repository.interface.js';

@Injectable()
export class AccountSessionRepository implements AccountSessionRepositoryInterface {
  constructor(@InjectRepository(AccountSessionEntity) private readonly sessions: Repository<AccountSessionEntity>) {}

  async createSession(accountId: string, sessionId: string, tokenHash: string, expiresAt: Date, metadata: SessionMetadata): Promise<boolean> {
    return this.sessions.manager.transaction(async (manager) => {
      // Serialize session creation with status changes and account soft deletion.
      const account = await manager.getRepository(AccountEntity).findOne({
        where: { id: accountId }, lock: { mode: 'pessimistic_write' }
      });
      if (!account || account.status !== AccountStatus.ACTIVE) return false;
      await manager.insert(AccountSessionEntity, {
        id: sessionId, accountId, refreshTokenHash: tokenHash, expiresAt,
        deviceId: metadata.deviceId ?? null, deviceName: metadata.deviceName ?? null,
        userAgent: metadata.userAgent ?? null
      });
      return true;
    });
  }

  async rotateIfCurrent(accountId: string, sessionId: string, expectedHash: string, nextHash: string, nextExpiry: Date): Promise<boolean> {
    const result = await this.sessions.createQueryBuilder().update(AccountSessionEntity)
      .set({ refreshTokenHash: nextHash, expiresAt: nextExpiry, lastUsedAt: () => 'now()' })
      .where('id = :sessionId AND account_id = :accountId AND refresh_token_hash = :expectedHash', { sessionId, accountId, expectedHash })
      .andWhere('revoked_at IS NULL AND expires_at > now()')
      .andWhere("EXISTS (SELECT 1 FROM accounts a WHERE a.id = account_id AND a.status = 'ACTIVE' AND a.deleted_at IS NULL)")
      .execute();
    return result.affected === 1;
  }

  async revokeIfCurrent(accountId: string, sessionId: string, expectedHash: string): Promise<boolean> {
    const result = await this.sessions.createQueryBuilder().update(AccountSessionEntity)
      .set({ revokedAt: () => 'now()' })
      .where('id = :sessionId AND account_id = :accountId AND refresh_token_hash = :expectedHash', { sessionId, accountId, expectedHash })
      .andWhere('revoked_at IS NULL AND expires_at > now()')
      .andWhere("EXISTS (SELECT 1 FROM accounts a WHERE a.id = account_id AND a.status = 'ACTIVE' AND a.deleted_at IS NULL)")
      .execute();
    return result.affected === 1;
  }
}
