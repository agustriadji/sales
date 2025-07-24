import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';

import {
  CreateWishlistCommand,
  CreateWishlistCommandProps,
} from './create-wishlist.command';
import { CreateWishlistHandler } from './create-wishlist.handler';

const CreateWishlistCommandPropsStub = {
  generate(): CreateWishlistCommandProps {
    return {
      identity: IdentityStub.generate(),
      name: faker.string.alphanumeric({ length: { min: 1, max: 50 } }),
    };
  },
};

describe('CreateWishlistHandler', () => {
  let handler: CreateWishlistHandler;
  let logger: DeepMocked<PinoLogger>;
  let wishlistRepository: DeepMocked<IWishlistWriteRepository>;
  let eventBus: DeepMocked<EventBus>;

  beforeEach(() => {
    wishlistRepository = createMock<IWishlistWriteRepository>();
    logger = createMock<PinoLogger>();
    eventBus = createMock<EventBus>();
    handler = new CreateWishlistHandler(logger, wishlistRepository, eventBus);
  });

  describe('execute()', () => {
    it(`should throw given wishlist already exists`, async () => {
      const props = CreateWishlistCommandPropsStub.generate();
      const cmd = new CreateWishlistCommand(props);
      wishlistRepository.isNameExists.mockResolvedValue(true);

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should create a new wishlist`, async () => {
      const props = CreateWishlistCommandPropsStub.generate();
      const cmd = new CreateWishlistCommand(props);
      wishlistRepository.isNameExists.mockResolvedValue(false);

      await handler.execute(cmd);
      expect(wishlistRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
