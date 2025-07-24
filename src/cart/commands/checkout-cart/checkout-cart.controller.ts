import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelatableRequest } from '@wings-corporation/core';
import { Identity } from '@wings-corporation/nest-http';
import {
  BuyerMustNotBeSuspendedInterceptor,
  UserIdentity,
} from '@wings-online/common';

import { CheckoutCartBodyDto } from './checkout-cart.body.dto';
import { CheckoutCartCommand } from './checkout-cart.command';

@UseInterceptors(BuyerMustNotBeSuspendedInterceptor)
@Controller()
export class CheckoutCartController {
  constructor(private readonly commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/cart.checkout')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: CheckoutCartBodyDto,
  ): Promise<any> {
    const cmd = new CheckoutCartCommand({
      identity,
      dryDeliveryDate: body.dry_delivery_date,
      frozenDeliveryDate: body.frozen_delivery_date,
      latitude: body.latitude,
      longitude: body.longitude,
      isSimulatePrice: body.is_simulate_price,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
