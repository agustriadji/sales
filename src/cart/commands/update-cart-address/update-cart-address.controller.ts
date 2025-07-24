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

import { UpdateCartAddressBodyDto } from './update-cart-address.body.dto';
import { UpdateCartAddressCommand } from './update-cart-address.command';

@Controller()
export class UpdateCartAddressController {
  constructor(private commandBus: CommandBus) {}
  @HttpCode(HttpStatus.OK)
  @Post('/cart.update-delivery-address')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: UpdateCartAddressBodyDto,
  ) {
    const cmd = new UpdateCartAddressCommand({
      identity,
      deliveryAddressId: body.delivery_address_id,
      type: body.type,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
