import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard.js';
import type { AuthenticatedPrincipal } from '../auth/types/authenticated-principal.js';
import { Roles } from '../authorization/roles.decorator.js';
import { RolesGuard } from '../authorization/roles.guard.js';
import { CustomerProfileCreateDto, CustomerProfileUpdateDto, SellerApplicationDto } from './profile.dto.js';
import { ProfileService } from './profile.service.js';

@Controller('customer')
@UseGuards(JwtAccessTokenGuard)
export class CustomerProfileController {
  constructor(private readonly profiles: ProfileService) {}
  @Get('me')
  me(@Req() req: Request & { user: AuthenticatedPrincipal }) { return this.profiles.customerForAccount(req.user.id); }
  @Post('me')
  create(@Req() req: Request & { user: AuthenticatedPrincipal }, @Body() body: CustomerProfileCreateDto) {
    return this.profiles.createCustomer(req.user.id, body);
  }
  @Patch('me')
  update(@Req() req: Request & { user: AuthenticatedPrincipal }, @Body() body: CustomerProfileUpdateDto) {
    return this.profiles.updateCustomer(req.user.id, body);
  }
}

@Controller('seller')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
export class SellerProfileController {
  constructor(private readonly profiles: ProfileService) {}
  @Get('me')
  me(@Req() req: Request & { user: AuthenticatedPrincipal }) { return this.profiles.sellerForAccount(req.user.id); }
  @Post('apply')
  apply(@Req() req: Request & { user: AuthenticatedPrincipal }, @Body() body: SellerApplicationDto) {
    return this.profiles.applySeller(req.user.id, body.displayName);
  }
  @Patch(':id/approve')
  @Roles('ADMIN')
  approve(@Param('id', ParseUUIDPipe) id: string) { return this.profiles.reviewSeller(id, true); }
  @Patch(':id/reject')
  @Roles('ADMIN')
  reject(@Param('id', ParseUUIDPipe) id: string) { return this.profiles.reviewSeller(id, false); }
}
