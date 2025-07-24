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

import { DeleteWishlistBodyDto } from './delete-wishlist.body.dto';
import { DeleteWishlistCommand } from './delete-wishlist.command';

@Controller()
export class DeleteWishlistController {
  constructor(private commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/wishlist.delete')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: DeleteWishlistBodyDto,
  ) {
    const cmd = new DeleteWishlistCommand({
      identity,
      id: body.id,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
