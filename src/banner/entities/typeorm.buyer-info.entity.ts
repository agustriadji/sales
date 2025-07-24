import { Column, Entity, PrimaryColumn } from 'typeorm';

import { BuyerType } from '@wings-online/cart/cart.constants';

@Entity({ schema: 'sales', name: 'buyer_info' })
export class TypeOrmBuyerInfoEntity {
  @PrimaryColumn({ type: 'uuid', name: 'buyer_id' })
  readonly buyerId: string;

  @PrimaryColumn()
  readonly type: BuyerType;

  @Column()
  readonly closeSuggestionBannerAt: Date;
}
