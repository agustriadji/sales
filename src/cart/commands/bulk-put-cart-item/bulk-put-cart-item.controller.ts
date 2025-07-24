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

import { BulkPutCartItemBodyDto } from './bulk-put-cart-item.body.dto';
import { BulkPutCartItemCommand } from './bulk-put-cart-item.command';

@Controller()
export class BulkPutCartItemController {
  constructor(private readonly commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/cart.items.bulk-put')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: BulkPutCartItemBodyDto,
  ): Promise<any> {
    const cmd = new BulkPutCartItemCommand({
      items: body.items.map((item) => ({
        itemId: item.item_id,
        baseQty: item.base_qty,
        packQty: item.pack_qty,
      })),
      identity,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
