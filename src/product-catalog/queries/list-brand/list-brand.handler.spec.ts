import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { IdentityStub } from '@stubs/identity.stub';
import { IBrandReadRepository } from '@wings-online/product-catalog/interfaces';
import { CategoryTypes } from '@wings-online/product-catalog/product-catalog.constants';
import { BrandReadModel } from '@wings-online/product-catalog/read-models';

import { ListBrandHandler } from './list-brand.handler';
import { ListBrandQuery } from './list-brand.query';

export const BrandStub = {
  generate(count: number): BrandReadModel[] {
    const items: BrandReadModel[] = [];
    for (let i = 0; i < count; i++) {
      items.push({
        id: faker.number.int(),
        name: faker.string.alphanumeric(),
        image: faker.string.alphanumeric(),
        prod_heir: faker.string.alphanumeric(),
        category_type: faker.helpers.arrayElement([null, faker.lorem.word()]),
        category_id: faker.helpers.arrayElement([null, faker.number.int()]),
        category_name: faker.helpers.arrayElement([null, faker.lorem.word()]),
        category_icon: faker.helpers.arrayElement([null, faker.lorem.word()]),
        category_image: faker.helpers.arrayElement([null, faker.lorem.word()]),
      });
    }
    return items;
  },
};

describe('ListBrandHandler', () => {
  let handler: ListBrandHandler;
  let logger: DeepMocked<PinoLogger>;
  let repository: DeepMocked<IBrandReadRepository>;

  beforeEach(() => {
    repository = createMock();
    logger = createMock<PinoLogger>();
    handler = new ListBrandHandler(logger, repository);
  });

  describe('execute()', () => {
    it(`should issue query correctly to repository`, async () => {
      const query = new ListBrandQuery({
        identity: IdentityStub.generate(),
        type: CategoryTypes.DRY,
      });
      repository.listBrands.mockImplementationOnce(async () =>
        BrandStub.generate(2),
      );
      await handler.execute(query);
      expect(repository.listBrands).toHaveBeenCalledWith({
        ...query,
        useCache: true,
      });
    });
  });
});
