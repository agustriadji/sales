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

import { PutCartItemBodyDto } from './put-cart-item.body.dto';
import { PutCartItemCommand } from './put-cart-item.command';

@Controller()
export class PutCartItemController {
  constructor(private readonly commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/cart.items.put')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: PutCartItemBodyDto,
  ): Promise<any> {
    const cmd = new PutCartItemCommand({
      itemId: body.item_id,
      baseQty: body.base_qty,
      packQty: body.pack_qty,
      identity,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
