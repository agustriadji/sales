import { ArgumentMetadata, PipeTransform } from '@nestjs/common';

import { createBadRequestException } from '../utils';
import { QueryStringUtils } from '../utils/query-string.util';

export class QueryStringPipe implements PipeTransform {
  /**
   *
   * @param value
   * @param metadata
   * @returns
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: any, _: ArgumentMetadata) {
    try {
      if (value.filter) {
        const filter = QueryStringUtils.parseFilter(value.filter);
        value.filter = filter;
      }

      if (value.sort) {
        const sort = QueryStringUtils.parseSort(value.sort);
        value.sort = sort;
      }
    } catch (error) {
      throw createBadRequestException(
        'request/validation-failed',
        error.message,
      );
    }

    return value;
  }
}
