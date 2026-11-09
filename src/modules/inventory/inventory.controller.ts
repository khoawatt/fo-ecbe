import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard.js';
import type { AuthenticatedPrincipal } from '../auth/types/authenticated-principal.js';
import { Roles } from '../authorization/roles.decorator.js';
import { RolesGuard } from '../authorization/roles.guard.js';
import { CreateInventoryDto, AdjustInventoryDto } from './inventory.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('stores/:storeId/inventory')
@Roles('SELLER')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get(':variantId')
  get(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string) { return this.inventory.get(req.user.id, storeId, variantId); }
  @Post(':variantId')
  create(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string, @Body() body: CreateInventoryDto) {
    return this.inventory.create(req.user.id, storeId, variantId, body.quantity);
  }
  @Patch(':variantId/adjust')
  adjust(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string, @Body() body: AdjustInventoryDto) {
    return this.inventory.adjust(req.user.id, storeId, variantId, body.delta);
  }
}
