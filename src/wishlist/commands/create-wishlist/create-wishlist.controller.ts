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

import { CreateWishlistBodyDto } from './create-wishlist.body.dto';
import { CreateWishlistCommand } from './create-wishlist.command';

@Controller()
export class CreateWishlistController {
  constructor(private commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/wishlist.create')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: CreateWishlistBodyDto,
  ) {
    const cmd = new CreateWishlistCommand({
      identity,
      name: body.name,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
