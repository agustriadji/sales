import { createMock } from '@golevelup/ts-jest';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { IdentityStub } from '@stubs/identity.stub';
import { HttpErrorResponse } from '@wings-corporation/core';

import { BuyerMustNotBeSuspendedInterceptor } from './buyer-must-not-be-suspended.interceptor';

describe('BuyerMustNotBeSuspendedInterceptor', () => {
  describe('intercept()', () => {
    const expectedResponse: HttpErrorResponse = {
      ok: false,
      error: {
        code: 'buyer-suspended',
        details: undefined,
      },
    };

    it('should throw when user is not active', () => {
      const context = createMock<ExecutionContext>();
      const request = createMock<HttpArgumentsHost>({
        getRequest() {
          return {
            identity: IdentityStub.generate({
              isActive: false,
            }),
          };
        },
      });
      jest.spyOn(context, 'switchToHttp').mockReturnValue({
        getRequest: () => request,
      } as HttpArgumentsHost);

      const next = createMock<CallHandler>();
      const interceptor = new BuyerMustNotBeSuspendedInterceptor();

      expect(() => interceptor.intercept(context, next)).toThrow(
        BadRequestException,
      );

      try {
        interceptor.intercept(context, next);
      } catch (error) {
        const errorObject = error as HttpException;
        expect(errorObject.getResponse()).toEqual(expectedResponse);
      }
    });

    it('should not throw when user is active', () => {
      const context = createMock<ExecutionContext>();
      const request = createMock<HttpArgumentsHost>({
        getRequest() {
          return {
            identity: IdentityStub.generate({
              isActive: true,
            }),
          };
        },
      });
      jest.spyOn(context, 'switchToHttp').mockReturnValue(request);

      const next = createMock<CallHandler>();

      const interceptor = new BuyerMustNotBeSuspendedInterceptor();

      expect(() => interceptor.intercept(context, next)).not.toThrow();
    });
  });
});
