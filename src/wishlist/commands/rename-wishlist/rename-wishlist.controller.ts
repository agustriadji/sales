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

import { RenameWishlistBodyDto } from './rename-wishlist.body.dto';
import { RenameWishlistCommand } from './rename-wishlist.command';

@Controller()
export class RenameWishlistController {
  constructor(private commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/wishlist.rename')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: RenameWishlistBodyDto,
  ) {
    const cmd = new RenameWishlistCommand({
      identity,
      id: body.id,
      name: body.name,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
