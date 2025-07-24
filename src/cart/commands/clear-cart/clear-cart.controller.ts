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

import { ClearCartBodyDto } from './clear-cart.body.dto';
import { ClearCartCommand } from './clear-cart.command';

@Controller()
export class ClearCartController {
  constructor(private commandBus: CommandBus) {}
  @HttpCode(HttpStatus.OK)
  @Post('/cart.clear')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: ClearCartBodyDto,
  ) {
    const cmd = new ClearCartCommand({
      identity,
      type: body.type,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
