import { map, Observable } from 'rxjs';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

@Injectable()
export class JsonSerializerInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler<any>): Observable<any> {
    return next
      .handle()
      .pipe(map((res) => (this.isSerializeable(res) ? res.toJSON() : res)));
  }

  private isSerializeable(object: any): object is isSerializeableToJson {
    return (<isSerializeableToJson>object)?.toJSON !== undefined;
  }
}

type isSerializeableToJson = {
  toJSON(): Record<string, any>;
};
