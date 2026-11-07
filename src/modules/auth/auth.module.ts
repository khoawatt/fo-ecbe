import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigModule } from '../../config/config.module.js';
import { AccountModule } from '../account/account.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAccessTokenGuard } from './guards/jwt-access-token.guard.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { JwtAccessTokenStrategy } from './strategies/jwt-access-token.strategy.js';
import { LocalStrategy } from './strategies/local.strategy.js';

@Module({
  imports: [
    AppConfigModule,
    AccountModule,
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('app.jwtAccessSecret'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.getOrThrow<number>('app.jwtAccessTtlSeconds'),
          issuer: config.getOrThrow<string>('app.jwtAccessIssuer'),
          audience: config.getOrThrow<string>('app.jwtAccessAudience')
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: config.getOrThrow<string>('app.jwtAccessIssuer'),
          audience: config.getOrThrow<string>('app.jwtAccessAudience')
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtAccessTokenStrategy, LocalAuthGuard, JwtAccessTokenGuard],
  exports: [JwtAccessTokenGuard]
})
export class AuthModule {}
