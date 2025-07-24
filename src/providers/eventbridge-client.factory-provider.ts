import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { ConfigService } from '@nestjs/config';
import { getXRayInstance } from '@wings-corporation/nest-xray';

export const EventBridgeClientFactoryProvider = (config: ConfigService) => {
  return getXRayInstance().captureAWSv3Client(
    new EventBridgeClient({
      region:
        config.get('EVENTBRIDGE_REGION') || config.get('AWS_DEFAULT_REGION'),
    }),
  );
};
