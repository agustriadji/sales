import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { Wishlist } from '@wings-online/wishlist/domains';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';

import {
  AddWishlistItemsCommand,
  AddWishlistItemsCommandProps,
} from './add-wishlist-items.command';
import { AddWishlistItemsHandler } from './add-wishlist-items.handler';

const AddWishlistItemPropsStub = {
  generate(): AddWishlistItemsCommandProps {
    return {
      identity: IdentityStub.generate(),
      wishlistId: faker.string.uuid(),
      itemIds: Array.from(
        { length: faker.number.int({ min: 1, max: 5 }) },
        () => faker.string.uuid(),
      ),
    };
  },
};

describe('AddWishlistItemsHandler', () => {
  let handler: AddWishlistItemsHandler;
  let logger: DeepMocked<PinoLogger>;
  let wishlistRepository: DeepMocked<IWishlistWriteRepository>;
  let eventBus: DeepMocked<EventBus>;

  beforeEach(() => {
    wishlistRepository = createMock<IWishlistWriteRepository>();
    logger = createMock<PinoLogger>();
    eventBus = createMock<EventBus>();
    handler = new AddWishlistItemsHandler(logger, wishlistRepository, eventBus);
  });

  describe('execute()', () => {
    it(`should throw given wishlist not found`, async () => {
      const props = AddWishlistItemPropsStub.generate();
      const cmd = new AddWishlistItemsCommand(props);
      wishlistRepository.findById.mockResolvedValue(undefined);

      await expect(handler.execute(cmd)).rejects.toThrow();
      expect(wishlistRepository.save).not.toHaveBeenCalled();
    });

    it(`should use default wishlist when not give wishlist_id`, async () => {
      const props = AddWishlistItemPropsStub.generate();
      const cmd = new AddWishlistItemsCommand({
        ...props,
        wishlistId: undefined,
      });
      const wishlist = createMock<Wishlist>({
        buyerId: props.identity.id,
        isDefault: true,
      });
      wishlistRepository.findDefault.mockResolvedValue(wishlist);

      await handler.execute(cmd);
      expect(wishlist.addItem).toHaveBeenCalledTimes(props.itemIds.length);
      expect(wishlistRepository.save).toHaveBeenCalledWith(
        wishlist,
        cmd.data.identity,
      );
    });

    it(`should add item to wishlist`, async () => {
      const props = AddWishlistItemPropsStub.generate();
      const cmd = new AddWishlistItemsCommand(props);
      const wishlist = createMock<Wishlist>({
        buyerId: props.identity.id,
      });
      wishlistRepository.findById.mockResolvedValue(wishlist);

      await handler.execute(cmd);
      expect(wishlist.addItem).toHaveBeenCalledTimes(props.itemIds.length);
      expect(wishlistRepository.save).toHaveBeenCalledWith(
        wishlist,
        cmd.data.identity,
      );
    });
  });
});
