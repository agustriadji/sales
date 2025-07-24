import { faker } from '@faker-js/faker';

process.env.JWT_SECRET = Buffer.from(faker.string.alphanumeric(32)).toString(
  'base64',
);
