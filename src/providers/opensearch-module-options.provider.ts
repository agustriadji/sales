import { OpensearchClientOptionsFactory } from 'nestjs-opensearch';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientOptions } from '@opensearch-project/opensearch/.';
import { BasicAuth } from '@opensearch-project/opensearch/lib/pool';

@Injectable()
export class OpensearchModuleOptionsProvider
  implements OpensearchClientOptionsFactory
{
  constructor(private readonly config: ConfigService) {}

  public async createOpensearchClientOptions(): Promise<ClientOptions> {
    const credential = this.config
      .get<string>('OPENSEARCH_CREDENTIAL')
      ?.split(':');

    const auth: BasicAuth | undefined = credential
      ? {
          username: credential[0],
          password: credential[1],
        }
      : undefined;

    return {
      node: this.config.getOrThrow('OPENSEARCH_NODE'),
      auth,
    };
  }
}
