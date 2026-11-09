import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard.js';
import type { AuthenticatedPrincipal } from '../auth/types/authenticated-principal.js';
import { Roles } from '../authorization/roles.decorator.js';
import { RolesGuard } from '../authorization/roles.guard.js';
import { CreateStoreDto, UpdateStoreDto } from './store.dto.js';
import { StoreService } from './store.service.js';

@Controller('stores')
export class StoreController {
  constructor(private readonly stores: StoreService) {}
  @Get('mine') @Roles('SELLER') @UseGuards(JwtAccessTokenGuard, RolesGuard)
  mine(@Req() req: Request & { user: AuthenticatedPrincipal }) { return this.stores.mine(req.user.id); }
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.stores.publicStore(id); }
  @Post() @Roles('SELLER') @UseGuards(JwtAccessTokenGuard, RolesGuard)
  create(@Req() req: Request & { user: AuthenticatedPrincipal }, @Body() body: CreateStoreDto) {
    return this.stores.create(req.user.id, body);
  }
  @Patch(':id') @Roles('SELLER') @UseGuards(JwtAccessTokenGuard, RolesGuard)
  update(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateStoreDto) {
    return this.stores.update(req.user.id, id, body);
  }
}
