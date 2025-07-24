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

import { DeleteCartItemBodyDto } from './delete-cart-item.body.dto';
import { DeleteCartItemCommand } from './delete-cart-item.command';

@Controller()
export class DeleteCartItemController {
  constructor(private readonly commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/cart.items.delete')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: DeleteCartItemBodyDto,
  ): Promise<any> {
    const command = new DeleteCartItemCommand({
      itemId: body.item_id,
      identity,
      type: body.type,
    }).withRequestMetadata(req);
    return this.commandBus.execute(command);
  }
}
