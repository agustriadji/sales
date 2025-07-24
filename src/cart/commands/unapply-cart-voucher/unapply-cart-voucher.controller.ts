import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelatableRequest } from '@wings-corporation/core';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { UnapplyCartVoucherBodyDto } from './unapply-cart-voucher.body.dto';
import { UnapplyCartVoucherCommand } from './unapply-cart-voucher.command';

@Controller()
export class UnapplyCartVoucherController {
  constructor(private commandBus: CommandBus) {}
  @HttpCode(HttpStatus.OK)
  @Post('/cart.voucher.unapply')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: UnapplyCartVoucherBodyDto,
  ) {
    const cmd = new UnapplyCartVoucherCommand({
      identity,
      type: body.type,
      voucherIds: body.voucher_ids,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
