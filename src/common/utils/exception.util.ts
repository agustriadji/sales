import { kebabCase } from 'lodash';

import { BadRequestException } from '@nestjs/common';
import { DomainException, HttpErrorResponse } from '@wings-corporation/core';

export const createBadRequestException = (
  code: string,
  details?: Record<string, any>,
) => {
  return new BadRequestException({
    ok: false,
    error: {
      code,
      details: details,
    },
  } as HttpErrorResponse);
};

export const resolveErrorCode = (exception: Error): string => {
  if (exception instanceof DomainException) {
    return kebabCase(exception.message);
  } else {
    throw new Error(
      `unable to resolve error code from exception ${exception.name}`,
    );
  }
};
