import { camelCase } from 'lodash';

import { FilterConditions, SortCondition, SortDirection } from '../interfaces';
import { StringUtils } from './string.utils';

export const SORT_URL_REGEX =
  /^[a-zA-Z_]+\\|(ASC|DESC)(\\|[a-zA-Z_]+\\|(ASC|DESC))*$/;
export const FILTER_URL_REGEX =
  /^([\w_]+:(in\(([\w\s\-+@&.,:;'"!?()]+(\s?\|\s?[\w\s\-+@&.,:;'"!?()]+)*)\)|eql\([\w\s\-+@&.,:;'"!?()]+\)|between\([\w-]+\|[\w-]+\))(,)?)+$/;

type Options = 'in' | 'eql' | 'between';

export class QueryStringUtils {
  static parseFilter(value: string): FilterConditions {
    this.validatePattern(value, FILTER_URL_REGEX, 'filter');
    return value.split(',').reduce((result, filter) => {
      const [field, ...operator] = filter.split(':');
      const matches = operator
        .join(':')
        .match(/(between|in|eql)\(([^]*)\)/) as RegExpMatchArray;
      const options = matches[1].toLowerCase() as Options;
      const values =
        matches[2].indexOf('|') > 0 ? matches[2].split('|') : matches[2];

      const isArray = Array.isArray(values);

      result[`${camelCase(field)}`] = {};
      if (options === 'eql')
        Object.assign(result[`${camelCase(field)}`], {
          equals: StringUtils.tryParse(isArray ? values[0] : values),
        });

      if (options === 'in')
        Object.assign(result[`${camelCase(field)}`], {
          in: (isArray ? values : [values]).map((value) =>
            StringUtils.tryParse(value),
          ),
        });

      if (options === 'between' && isArray && values[0] && values[1])
        Object.assign(result[`${camelCase(field)}`], {
          gte: StringUtils.tryParse(values[0]),
          lte: StringUtils.tryParse(values[1]),
        });

      return result;
    }, {} as FilterConditions);
  }

  static parseSort(value: string): SortCondition {
    this.validatePattern(value, SORT_URL_REGEX, 'sort');

    return value.split(',').reduce((result, sort) => {
      const [field, dir] = sort.split('|');
      result[`${camelCase(field)}`] = dir as SortDirection;
      return result;
    }, {} as SortCondition);
  }

  private static validatePattern(
    value: string,
    REGEX: RegExp,
    context: 'sort' | 'filter',
  ) {
    const isValid = REGEX.test(value);
    if (!isValid)
      throw new Error(`Query string ${context} rule: ${REGEX.source}`);
  }
}
