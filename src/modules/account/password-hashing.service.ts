import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';

@Injectable()
export class PasswordHashingService {
  constructor(private readonly config: ConfigService) {}

  async hash(password: string): Promise<string> {
    if (!password || Buffer.byteLength(password, 'utf8') > 72) {
      throw new RangeError('Password must contain between 1 and 72 UTF-8 bytes');
    }
    return hash(password, this.config.getOrThrow<number>('app.bcryptSaltRounds'));
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash)) return false;
    try {
      return await compare(password, passwordHash);
    } catch {
      return false;
    }
  }
}
