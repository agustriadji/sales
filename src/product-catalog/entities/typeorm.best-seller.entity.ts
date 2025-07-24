import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_sku_best_seller' })
export class TypeOrmBestSellerEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column({ name: 'material_id' })
  readonly externalId: string;

  @Column()
  readonly seq: number;

  @Column()
  readonly flagWs: string;
}
