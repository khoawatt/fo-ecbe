import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccountService } from '../account/account.service.js';
import { AccountStatus } from '../account/types/account-status.js';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard.js';
import type { AuthenticatedPrincipal } from '../auth/types/authenticated-principal.js';
import { RolesGuard } from '../authorization/roles.guard.js';
import { Roles } from '../authorization/roles.decorator.js';
import { AccountListDto } from './account-list.dto.js';
import { AccountUpdateDto, AdminAccountUpdateDto } from './account-update.dto.js';

@Controller('account')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  @Get('me')
  me(@Req() request: Request & { user: AuthenticatedPrincipal }) {
    return this.accounts.findById(request.user.id);
  }

  @Patch('me')
  updateMe(@Req() request: Request & { user: AuthenticatedPrincipal }, @Body() body: AccountUpdateDto) {
    return this.accounts.updateAccount(request.user.id, body);
  }

  @Get()
  @Roles('ADMIN')
  list(@Query() query: AccountListDto) {
    return this.accounts.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: AdminAccountUpdateDto) {
    return this.accounts.updateAccount(id, body);
  }

  @Patch(':id/disable')
  @Roles('ADMIN')
  disable(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.setAccountStatus(id, AccountStatus.DISABLED);
  }
}
