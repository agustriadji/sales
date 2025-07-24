import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { Wishlist } from '@wings-online/wishlist/domains';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';

import {
  DeleteWishlistCommand,
  DeleteWishlistCommandProps,
} from './delete-wishlist.command';
import { DeleteWishlistHandler } from './delete-wishlist.handler';

const DeleteWishlistCommandPropsStub = {
  generate(): DeleteWishlistCommandProps {
    return {
      identity: IdentityStub.generate(),
      id: faker.string.uuid(),
    };
  },
};

describe('DeleteWishlistHandler', () => {
  let handler: DeleteWishlistHandler;
  let logger: DeepMocked<PinoLogger>;
  let wishlistRepository: DeepMocked<IWishlistWriteRepository>;
  let eventBus: DeepMocked<EventBus>;

  beforeEach(() => {
    wishlistRepository = createMock<IWishlistWriteRepository>();
    logger = createMock<PinoLogger>();
    eventBus = createMock<EventBus>();
    handler = new DeleteWishlistHandler(logger, wishlistRepository, eventBus);
  });

  describe('execute()', () => {
    it(`should throw given wishlist not found`, async () => {
      const props = DeleteWishlistCommandPropsStub.generate();
      const cmd = new DeleteWishlistCommand(props);
      wishlistRepository.findById.mockResolvedValue(undefined);

      await expect(handler.execute(cmd)).rejects.toThrow();
      expect(wishlistRepository.delete).not.toHaveBeenCalled();
    });
    it(`should throw given wishlist is default wishlist`, async () => {
      const props = DeleteWishlistCommandPropsStub.generate();
      const cmd = new DeleteWishlistCommand(props);
      const wishlist = createMock<Wishlist>({
        isDefault: true,
      });
      wishlistRepository.findById.mockResolvedValue(wishlist);

      await expect(handler.execute(cmd)).rejects.toThrow();
      expect(wishlistRepository.delete).not.toHaveBeenCalled();
    });

    it(`should delete wishlist`, async () => {
      const props = DeleteWishlistCommandPropsStub.generate();
      const identity = IdentityStub.generate();
      const cmd = new DeleteWishlistCommand({ ...props, identity });
      const wishlist = createMock<Wishlist>({
        buyerId: props.identity.id,
        isDefault: false,
      });
      wishlistRepository.isNameExists.mockResolvedValue(false);
      wishlistRepository.findById.mockResolvedValue(wishlist);

      await handler.execute(cmd);
      expect(wishlistRepository.delete).toHaveBeenCalledWith(
        wishlist.id.value,
        cmd.data.identity,
      );
    });
  });
});
