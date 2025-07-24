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

import { CloseBannerSuggestionBodyDto } from './close-banner-suggestion.body.dto';
import { CloseBannerSuggestionCommand } from './close-banner-suggestion.command';

@Controller()
export class CloseBannerSuggestionController {
  constructor(private readonly commandBus: CommandBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/banners.close-suggestion')
  async handler(
    @Request() req: CorrelatableRequest,
    @Identity() identity: UserIdentity,
    @Body() body: CloseBannerSuggestionBodyDto,
  ): Promise<any> {
    const cmd = new CloseBannerSuggestionCommand({
      identity,
      type: body.type,
    }).withRequestMetadata(req);
    return this.commandBus.execute(cmd);
  }
}
