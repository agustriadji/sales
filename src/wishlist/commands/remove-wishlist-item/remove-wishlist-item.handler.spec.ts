import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { Wishlist } from '@wings-online/wishlist/domains';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';

import {
  RemoveWishlistItemCommand,
  RemoveWishlistItemCommandProps,
} from './remove-wishlist-item.command';
import { RemoveWishlistItemHandler } from './remove-wishlist-item.handler';

const RemoveWishlistItemPropsStub = {
  generate(): RemoveWishlistItemCommandProps {
    return {
      identity: IdentityStub.generate(),
      wishlistId: faker.string.uuid(),
      itemId: faker.string.uuid(),
    };
  },
};

describe('RemoveWishlistItemHandler', () => {
  let handler: RemoveWishlistItemHandler;
  let logger: DeepMocked<PinoLogger>;
  let wishlistRepository: DeepMocked<IWishlistWriteRepository>;
  let eventBus: DeepMocked<EventBus>;

  beforeEach(() => {
    wishlistRepository = createMock<IWishlistWriteRepository>();
    logger = createMock<PinoLogger>();
    eventBus = createMock<EventBus>();
    handler = new RemoveWishlistItemHandler(
      logger,
      wishlistRepository,
      eventBus,
    );
  });

  describe('execute()', () => {
    it(`should throw given wishlist not found`, async () => {
      const props = RemoveWishlistItemPropsStub.generate();
      const cmd = new RemoveWishlistItemCommand(props);
      wishlistRepository.findById.mockResolvedValue(undefined);

      await expect(handler.execute(cmd)).rejects.toThrow();
      expect(wishlistRepository.save).not.toHaveBeenCalled();
    });

    it(`should use default wishlist when not give wishlist_id`, async () => {
      const props = RemoveWishlistItemPropsStub.generate();
      const cmd = new RemoveWishlistItemCommand({
        ...props,
        wishlistId: undefined,
      });
      const wishlist = createMock<Wishlist>({
        buyerId: props.identity.id,
        isDefault: true,
      });
      wishlistRepository.findDefault.mockResolvedValue(wishlist);

      await handler.execute(cmd);
      expect(wishlist.removeItem).toHaveBeenCalledTimes(1);
      expect(wishlistRepository.save).toHaveBeenCalledWith(
        wishlist,
        cmd.data.identity,
      );
    });

    it(`should remove item from wishlist`, async () => {
      const props = RemoveWishlistItemPropsStub.generate();
      const cmd = new RemoveWishlistItemCommand(props);
      const wishlist = createMock<Wishlist>({
        buyerId: props.identity.id,
      });
      wishlistRepository.findById.mockResolvedValue(wishlist);

      await handler.execute(cmd);
      expect(wishlist.removeItem).toHaveBeenCalledTimes(1);
      expect(wishlistRepository.save).toHaveBeenCalledWith(
        wishlist,
        cmd.data.identity,
      );
    });
  });
});
