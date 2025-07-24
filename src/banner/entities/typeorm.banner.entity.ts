import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from '@wings-online/product-catalog/entities';

import { TypeOrmClusteringFirebaseEntity } from './typeorm.clustering-firebase.entity';

@Entity({ schema: 'public', name: 'm_promo_ads' })
export class TypeOrmBannerEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column({ name: 'm_material_id', type: 'varchar' })
  readonly materialId: string;

  @Column({ name: 'm_material_ws_id', type: 'varchar' })
  readonly materialWsId: string;

  @Column()
  readonly name: string;

  @Column()
  readonly image: string;

  @Column({ type: 'int' })
  readonly seq: number;

  @Column()
  readonly page: string;

  @Column()
  readonly shownAt: string;

  @Column({ name: 'banner_type' })
  readonly type: string;

  @Column()
  readonly isActive: boolean;

  @Column()
  readonly isDelete: boolean;

  @Column()
  readonly deletedDate: Date;

  @ManyToOne(() => TypeOrmItemEntity, (item) => item.externalId)
  @JoinColumn({ name: 'm_material_id' })
  readonly item: Relation<TypeOrmItemEntity>;

  @OneToMany(
    () => TypeOrmClusteringFirebaseEntity,
    (clustering) => clustering.banner,
  )
  readonly clustering: Relation<TypeOrmClusteringFirebaseEntity[]>;
}
