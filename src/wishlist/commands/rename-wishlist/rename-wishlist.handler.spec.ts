import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { Wishlist } from '@wings-online/wishlist/domains';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';

import {
  RenameWishlistCommand,
  RenameWishlistCommandProps,
} from './rename-wishlist.command';
import { RenameWishlistHandler } from './rename-wishlist.handler';

const RenameWishlistCommandPropsStub = {
  generate(): RenameWishlistCommandProps {
    return {
      identity: IdentityStub.generate(),
      id: faker.string.uuid(),
      name: faker.string.alphanumeric({ length: { min: 1, max: 50 } }),
    };
  },
};

describe('RenameWishlistHandler', () => {
  let handler: RenameWishlistHandler;
  let logger: DeepMocked<PinoLogger>;
  let wishlistRepository: DeepMocked<IWishlistWriteRepository>;
  let eventBus: DeepMocked<EventBus>;

  beforeEach(() => {
    wishlistRepository = createMock<IWishlistWriteRepository>();
    logger = createMock<PinoLogger>();
    eventBus = createMock<EventBus>();
    handler = new RenameWishlistHandler(logger, wishlistRepository, eventBus);
  });

  describe('execute()', () => {
    it(`should throw given wishlist not found`, async () => {
      const props = RenameWishlistCommandPropsStub.generate();
      const wishlist = createMock<Wishlist>();
      const cmd = new RenameWishlistCommand(props);
      wishlistRepository.isNameExists.mockResolvedValue(true);
      wishlistRepository.findById.mockResolvedValue(undefined);

      await expect(handler.execute(cmd)).rejects.toThrow();
      expect(wishlist.rename).not.toHaveBeenCalled();
      expect(wishlistRepository.save).not.toHaveBeenCalled();
    });

    it(`should throw given wishlist already exists`, async () => {
      const props = RenameWishlistCommandPropsStub.generate();
      const cmd = new RenameWishlistCommand(props);
      const wishlist = createMock<Wishlist>();
      wishlistRepository.isNameExists.mockResolvedValue(true);
      wishlistRepository.findById.mockResolvedValue(wishlist);

      await expect(handler.execute(cmd)).rejects.toThrow();
      expect(wishlist.rename).not.toHaveBeenCalled();
      expect(wishlistRepository.save).not.toHaveBeenCalled();
    });

    it(`should throw given wishlist is default wishlist`, async () => {
      const props = RenameWishlistCommandPropsStub.generate();
      const cmd = new RenameWishlistCommand(props);
      const wishlist = createMock<Wishlist>({
        isDefault: true,
      });
      wishlistRepository.isNameExists.mockResolvedValue(false);
      wishlistRepository.findById.mockResolvedValue(wishlist);

      await expect(handler.execute(cmd)).rejects.toThrow();
      expect(wishlist.rename).not.toHaveBeenCalled();
      expect(wishlistRepository.save).not.toHaveBeenCalled();
    });

    it(`should rename wishlist`, async () => {
      const props = RenameWishlistCommandPropsStub.generate();
      const cmd = new RenameWishlistCommand(props);
      const wishlist = createMock<Wishlist>({
        buyerId: props.identity.id,
        isDefault: false,
      });
      wishlistRepository.isNameExists.mockResolvedValue(false);
      wishlistRepository.findById.mockResolvedValue(wishlist);

      await handler.execute(cmd);
      expect(wishlist.rename).toHaveBeenCalledTimes(1);
      expect(wishlistRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
