import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IIdentity } from '@wings-corporation/core';
import {
  AuthModuleOptions,
  AuthOptionsFactory,
} from '@wings-corporation/nest-auth';
import { AuthService } from '@wings-online/auth';

@Injectable()
export class AuthModuleOptionsProvider implements AuthOptionsFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async createAuthOptions(): Promise<AuthModuleOptions> {
    return {
      legacyAlgorithm: 'HS512',
      legacyJwtSecret: Buffer.from(
        this.config.getOrThrow<string>('JWT_SECRET'),
        'base64',
      ),
      identityResolver: async (payload): Promise<IIdentity | undefined> => {
        return this.authService.getIdentityByExternalId(payload.sub);
      },
    };
  }
}
