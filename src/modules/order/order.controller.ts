import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard.js';
import type { AuthenticatedPrincipal } from '../auth/types/authenticated-principal.js';
import { Roles } from '../authorization/roles.decorator.js';
import { RolesGuard } from '../authorization/roles.guard.js';
import { CreateOrderDto } from './order.dto.js';
import { OrderService } from './order.service.js';

@Controller('orders')
@UseGuards(JwtAccessTokenGuard)
export class OrderController {
  constructor(private readonly orders: OrderService) {}
  @Post()
  create(@Req() req: Request & { user: AuthenticatedPrincipal }, @Body() body: CreateOrderDto) {
    return this.orders.create(req.user.id, body.storeId, body.items);
  }
  @Get('me')
  mine(@Req() req: Request & { user: AuthenticatedPrincipal }) { return this.orders.buyerList(req.user.id); }
  @Get(':id')
  get(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.buyerRead(req.user.id, id);
  }
  @Get('stores/:storeId/:id') @Roles('SELLER') @UseGuards(RolesGuard)
  seller(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string) { return this.orders.sellerRead(req.user.id, storeId, id); }
}
