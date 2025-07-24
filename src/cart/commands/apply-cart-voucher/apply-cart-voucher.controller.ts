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

import { ApplyCartVoucherBodyDto } from './apply-cart-voucher.body.dto';
import { ApplyCartVoucherCommand } from './apply-cart-voucher.command';

@Controller()
export class ApplyCartVoucherController {
  constructor(private commandBus: CommandBus) {}
  @HttpCode(HttpStatus.OK)
  @Post('/cart.voucher.apply')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: ApplyCartVoucherBodyDto,
  ) {
    const cmd = new ApplyCartVoucherCommand({
      identity,
      type: body.type,
      voucherIds: body.voucher_ids,
      withVoucherValidation: body.with_voucher_validation,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
