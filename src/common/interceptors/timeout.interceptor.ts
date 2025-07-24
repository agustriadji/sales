import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import {
  CallHandler,
  ExecutionContext,
  GatewayTimeoutException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HttpErrorResponse } from '@wings-corporation/core';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutInMillis: number) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutInMillis),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new GatewayTimeoutException({
            ok: false,
            error: {
              code: 'gateway-timeout',
            },
          } as HttpErrorResponse);
        }
        return throwError(() => err);
      }),
    );
  }
}
