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

import { AddWishlistItemsBodyDto } from './add-wishlist-items.body.dto';
import { AddWishlistItemsCommand } from './add-wishlist-items.command';

@Controller()
export class AddWishlistItemsController {
  constructor(private readonly commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/wishlist.items.add')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: AddWishlistItemsBodyDto,
  ): Promise<any> {
    const cmd = new AddWishlistItemsCommand({
      wishlistId: body.wishlist_id,
      itemIds: body.item_ids,
      identity,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
