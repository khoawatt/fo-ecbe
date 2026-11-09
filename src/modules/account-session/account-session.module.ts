import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountSessionEntity } from '../../database/entities/account-session.entity.js';
import { ACCOUNT_SESSION_REPOSITORY } from './account-session.constants.js';
import { AccountSessionRepository } from './account-session.repository.js';
import { AccountSessionService } from './account-session.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountSessionEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('app.jwtRefreshSecret'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.getOrThrow<number>('app.jwtRefreshTtlSeconds'),
          issuer: config.getOrThrow<string>('app.jwtRefreshIssuer'),
          audience: config.getOrThrow<string>('app.jwtRefreshAudience')
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: config.getOrThrow<string>('app.jwtRefreshIssuer'),
          audience: config.getOrThrow<string>('app.jwtRefreshAudience')
        }
      })
    })
  ],
  providers: [AccountSessionRepository, AccountSessionService, { provide: ACCOUNT_SESSION_REPOSITORY, useExisting: AccountSessionRepository }],
  exports: [AccountSessionService]
})
export class AccountSessionModule {}
