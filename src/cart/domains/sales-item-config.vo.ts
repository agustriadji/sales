import { ValueObject } from '@wings-corporation/domain';
import { SalesTier } from '@wings-online/common';

import { Tag } from './tag.vo';

export type SalesItemConfigProps = {
  key: string;
  tags: Tag[];
};

export class SalesItemConfig extends ValueObject<SalesItemConfigProps> {
  private constructor(props: SalesItemConfigProps) {
    super(props);
  }

  public static create(props: SalesItemConfigProps): SalesItemConfig {
    return new SalesItemConfig(props);
  }

  get tier(): SalesTier {
    if (this._value.key.includes(':')) return SalesTier.create(2);
    return SalesTier.create(1);
  }

  get key(): string {
    return this._value.key;
  }

  get tags(): Tag[] {
    return this._value.tags;
  }
}
