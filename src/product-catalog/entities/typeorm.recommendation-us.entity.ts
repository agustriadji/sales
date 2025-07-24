import { Column, Entity, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'public', name: 'm_rekomendasi_us' })
export class TypeOrmRecommendationUsEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column()
  readonly seq: number;

  @Column({ name: 'customer_id', type: 'varchar' })
  readonly buyerExternalId: string;

  @Column({ name: 'material_id', type: 'int' })
  readonly externalId: string;

  @Column({ name: 'qty_order_pcs' })
  readonly baseQty: number;

  @Column({ name: 'qty_order' })
  readonly packQty: number;

  readonly item: Relation<TypeOrmItemEntity>;
}
