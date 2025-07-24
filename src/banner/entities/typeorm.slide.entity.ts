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

@Entity({ schema: 'public', name: 'slide' })
export class TypeOrmSlideEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column({ name: 'm_material_id' })
  readonly materialId: string;

  @Column({ name: 'm_material_ws_id' })
  readonly materialWsId: string;

  @Column({ name: 'image_slide' })
  readonly image: string;

  @Column()
  readonly isShown: boolean;

  @Column()
  readonly isDelete: boolean;

  @Column()
  readonly page: string;

  @Column({ type: 'int' })
  readonly seq: number;

  @Column()
  readonly shownAt: string;

  @ManyToOne(() => TypeOrmItemEntity, (item) => item.externalId)
  @JoinColumn({ name: 'm_material_id' })
  readonly item: Relation<TypeOrmItemEntity>;

  @OneToMany(
    () => TypeOrmClusteringFirebaseEntity,
    (clustering) => clustering.slide,
  )
  readonly clustering: Relation<TypeOrmClusteringFirebaseEntity[]>;
}
