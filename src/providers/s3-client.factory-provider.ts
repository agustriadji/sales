import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { getXRayInstance } from '@wings-corporation/nest-xray';

export const S3ClientFactoryProvider = (config: ConfigService) => {
  return getXRayInstance().captureAWSv3Client(
    new S3Client({
      region: config.get('S3_REGION') || config.get('AWS_DEFAULT_REGION'),
    }),
  );
};
