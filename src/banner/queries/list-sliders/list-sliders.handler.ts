import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SLIDE_READ_REPOSITORY } from '@wings-online/banner/banner.constants';
import { ISlideReadRepository } from '@wings-online/banner/interfaces';

import { ListSlidersQuery } from './list-sliders.query';
import { ListSlidersResult } from './list-sliders.result';

@QueryHandler(ListSlidersQuery)
export class ListSlidersHandler
  implements IQueryHandler<ListSlidersQuery, ListSlidersResult>
{
  constructor(
    @InjectPinoLogger(ListSlidersHandler.name)
    private readonly logger: PinoLogger,
    @Inject(SLIDE_READ_REPOSITORY)
    private readonly repository: ISlideReadRepository,
  ) {}

  async execute(query: ListSlidersQuery): Promise<ListSlidersResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });

    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const collection = await this.repository.listSliders(query.identity);

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

    return new ListSlidersResult(collection);
  }
}
