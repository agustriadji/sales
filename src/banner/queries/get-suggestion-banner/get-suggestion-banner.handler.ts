import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BANNER_READ_REPOSITORY } from '@wings-online/banner/banner.constants';
import { IBannerReadRepository } from '@wings-online/banner/interfaces';

import { GetSuggestionBannerQuery } from './get-suggestion-banner.query';
import { GetSuggestionBannerResult } from './get-suggestion-banner.result';

@QueryHandler(GetSuggestionBannerQuery)
export class GetSuggestionBannerHandler
  implements IQueryHandler<GetSuggestionBannerQuery, GetSuggestionBannerResult>
{
  constructor(
    @InjectPinoLogger(GetSuggestionBannerHandler.name)
    private readonly logger: PinoLogger,
    @Inject(BANNER_READ_REPOSITORY)
    private readonly repository: IBannerReadRepository,
  ) {}

  async execute(
    query: GetSuggestionBannerQuery,
  ): Promise<GetSuggestionBannerResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const suggestion = await this.repository.getSuggestion(query.identity);

    // Log memory usage in megabytes and bytes
    const memoryUsage = process.memoryUsage();
    this.logger.info(
      {
        memoryUsage: {
          rss: {
            bytes: memoryUsage.rss,
            megabytes: (memoryUsage.rss / (1024 * 1024)).toFixed(2),
          },
          heapTotal: {
            bytes: memoryUsage.heapTotal,
            megabytes: (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2),
          },
          heapUsed: {
            bytes: memoryUsage.heapUsed,
            megabytes: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
          },
          external: {
            bytes: memoryUsage.external,
            megabytes: (memoryUsage.external / (1024 * 1024)).toFixed(2),
          },
          arrayBuffers: {
            bytes: memoryUsage.arrayBuffers,
            megabytes: (memoryUsage.arrayBuffers / (1024 * 1024)).toFixed(2),
          },
        },
      },
      'After Memory Usage',
    );

    this.logger.trace(`END`);
    return new GetSuggestionBannerResult(suggestion);
  }
}
