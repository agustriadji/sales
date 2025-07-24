import { faker } from '@faker-js/faker';
import { OrganizationEnum } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export const IdentityStub = {
  generate(params?: {
    externalId?: string;
    isActive?: boolean;
    withNoDefaultAddress?: boolean;
  }): UserIdentity {
    return {
      id: faker.string.alphanumeric(),
      externalId: params?.externalId || faker.string.alpha(5),
      isActive: params?.isActive || faker.datatype.boolean(),
      division: {
        dry: {
          group: faker.string.alpha(5),
          salesOffice: faker.string.alpha(5),
          distChannel: faker.string.alpha(5),
          salesOrg: faker.string.alpha(5),
          salesGroup: faker.string.alpha(5),
          customerHier: faker.string.alpha(5),
          priceListType: faker.string.alpha(5),
          isRetailS: faker.datatype.boolean(),
          defaultDeliveryAddressId: params?.withNoDefaultAddress
            ? undefined
            : faker.string.uuid(),
        },
        frozen: {
          group: faker.string.alpha(5),
          salesOffice: faker.string.alpha(5),
          distChannel: faker.string.alpha(5),
          salesOrg: faker.string.alpha(5),
          salesGroup: faker.string.alpha(5),
          customerHier: faker.string.alpha(5),
          priceListType: faker.string.alpha(5),
          isRetailS: faker.datatype.boolean(),
          defaultDeliveryAddressId: params?.withNoDefaultAddress
            ? undefined
            : faker.string.uuid(),
        },
        type: 'BOTH',
      },
      organization: faker.helpers.enumValue(OrganizationEnum),
    };
  },
};
