import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { IIntegrationEvent } from '@wings-corporation/core';
import { EventBusModuleOptions } from '@wings-corporation/nest-event-bus';
import { ServiceReversedFQDN } from '@wings-online/app.constants';

export const EventBusFactoryProvider = (
  config: ConfigService,
  eventbridge: EventBridgeClient,
  s3: S3Client,
): EventBusModuleOptions<IIntegrationEvent> => {
  return {
    client: eventbridge,
    name: config.getOrThrow('EVENTBRIDGE_EVENT_BUS'),
    source: config.get('EVENTBRIDGE_EVENT_SOURCE') || ServiceReversedFQDN,
    largePayloadSupport:
      config.get('EVENTBRIDGE_LARGE_PAYLOAD_SUPPORT_ENABLED') === 'true'
        ? {
            provider: 's3',
            client: s3,
            bucketName: config.getOrThrow(`EVENT_BUCKET_NAME`),
            alwaysThroughS3:
              config.get('EVENTBRIDGE_ALWAYS_USE_S3_FOR_PAYLOADS') === 'true',
          }
        : false,
  };
};
