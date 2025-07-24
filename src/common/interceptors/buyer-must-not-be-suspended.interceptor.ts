import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { UserIdentity } from '../interfaces';
import { createBadRequestException } from '../utils';

@Injectable()
export class BuyerMustNotBeSuspendedInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const identity: UserIdentity = request.identity;

    if (!identity.isActive) throw createBadRequestException('buyer-suspended');

    return next.handle();
  }
}
