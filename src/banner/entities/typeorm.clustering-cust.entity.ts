import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmClusteringFirebaseEntity } from './typeorm.clustering-firebase.entity';

@Entity({ schema: 'public', name: 'm_clustering_cust' })
export class TypeOrmClusteringCustEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column()
  readonly custId: string;

  @Column({ name: 'id_clustering' })
  readonly clusteringId: number;

  @ManyToOne(
    () => TypeOrmClusteringFirebaseEntity,
    (item) => item.clusteringCust,
  )
  @JoinColumn({ name: 'id_clustering' })
  readonly clusteringFirebase: Relation<TypeOrmClusteringFirebaseEntity>;
}
