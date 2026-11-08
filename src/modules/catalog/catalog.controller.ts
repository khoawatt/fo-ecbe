import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard.js';
import type { AuthenticatedPrincipal } from '../auth/types/authenticated-principal.js';
import { Roles } from '../authorization/roles.decorator.js';
import { RolesGuard } from '../authorization/roles.guard.js';
import { CatalogService } from './catalog.service.js';
import { CreateProductDto, CreateVariantDto, UpdateProductDto, UpdateVariantDto } from './catalog.dto.js';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('stores/:storeId/products')
  list(@Param('storeId', ParseUUIDPipe) storeId: string) { return this.catalog.listPublished(storeId); }
  @Get('products/:id')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.catalog.publicProduct(id); }
  @Get('variants/:id')
  variant(@Param('id', ParseUUIDPipe) id: string) { return this.catalog.publishedVariant(id); }
  @Post('stores/:storeId/products') @Roles('SELLER') @UseGuards(JwtAccessTokenGuard, RolesGuard)
  create(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('storeId', ParseUUIDPipe) storeId: string, @Body() body: CreateProductDto) {
    return this.catalog.createProduct(req.user.id, storeId, body.name);
  }
  @Patch('products/:id') @Roles('SELLER') @UseGuards(JwtAccessTokenGuard, RolesGuard)
  update(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateProductDto) {
    return this.catalog.updateProduct(req.user.id, id, body);
  }
  @Post('products/:id/variants') @Roles('SELLER') @UseGuards(JwtAccessTokenGuard, RolesGuard)
  createVariant(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('id', ParseUUIDPipe) id: string, @Body() body: CreateVariantDto) {
    return this.catalog.createVariant(req.user.id, id, body.sku, body.priceCents);
  }
  @Patch('variants/:id') @Roles('SELLER') @UseGuards(JwtAccessTokenGuard, RolesGuard)
  updateVariant(@Req() req: Request & { user: AuthenticatedPrincipal }, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateVariantDto) {
    return this.catalog.updateVariant(req.user.id, id, body);
  }
}
