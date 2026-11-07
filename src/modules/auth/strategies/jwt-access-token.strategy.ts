import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedPrincipal } from '../types/authenticated-principal.js';

@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  private readonly ttlSeconds: number;

  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('app.jwtAccessSecret'),
      algorithms: ['HS256'],
      issuer: config.getOrThrow<string>('app.jwtAccessIssuer'),
      audience: config.getOrThrow<string>('app.jwtAccessAudience')
    });
    this.ttlSeconds = config.getOrThrow<number>('app.jwtAccessTtlSeconds');
  }

  validate(payload: unknown): AuthenticatedPrincipal {
    if (!payload || typeof payload !== 'object') throw new UnauthorizedException('Invalid access token');
    const claims = payload as Record<string, unknown>;
    if (
      !isUUID(claims.sub) ||
      claims.tokenType !== 'access' ||
      !Array.isArray(claims.roleCodes) ||
      !claims.roleCodes.every((code: unknown) => typeof code === 'string' && /^[A-Z][A-Z0-9_]*$/.test(code)) ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      (claims.iat as number) < 0 ||
      (claims.iat as number) > Math.floor(Date.now() / 1000) ||
      (claims.exp as number) <= (claims.iat as number) ||
      (claims.exp as number) - (claims.iat as number) > this.ttlSeconds
    ) {
      throw new UnauthorizedException('Invalid access token');
    }
    return { id: claims.sub as string, roleCodes: [...claims.roleCodes] as string[] };
  }
}
