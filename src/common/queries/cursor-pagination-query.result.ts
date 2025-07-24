import { IQueryResult } from '@nestjs/cqrs';
import { Collection } from '@wings-corporation/core';

import { ReadModel } from '../domains';

interface ICursorPaginationQueryResponseMetadata {
  next_cursor?: string;
}

interface ICursorPaginationQueryResponse {
  metadata: {
    next_cursor?: string;
  };
}

export abstract class CursorPaginationQueryResult<TReadModel extends ReadModel>
  implements ICursorPaginationQueryResponse, IQueryResult
{
  readonly metadata: ICursorPaginationQueryResponseMetadata;
  readonly data: Record<string, any>[];

  constructor(collection: Collection<TReadModel>) {
    const { nextCursor } = collection.metadata;

    this.metadata = {
      next_cursor: nextCursor,
    };
    this.data = collection.data.map((x) => x.toJSON());
  }
}
