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

import { RemoveWishlistItemBodyDto } from './remove-wishlist-item.body.dto';
import { RemoveWishlistItemCommand } from './remove-wishlist-item.command';

@Controller()
export class RemoveWishlistItemController {
  constructor(private readonly commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/wishlist.items.remove')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: RemoveWishlistItemBodyDto,
  ): Promise<any> {
    const cmd = new RemoveWishlistItemCommand({
      wishlistId: body.wishlist_id,
      itemId: body.item_id,
      identity,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
