import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmBannerEntity } from './typeorm.banner.entity';
import { TypeOrmClusteringCustEntity } from './typeorm.clustering-cust.entity';
import { TypeOrmSlideEntity } from './typeorm.slide.entity';

@Entity({ schema: 'public', name: 'm_clustering_firebase' })
export class TypeOrmClusteringFirebaseEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column()
  readonly idMessage: number;

  @Column()
  readonly slsOffice: string;

  @Column()
  readonly custGroup: string;

  @Column({ name: 'fitur' })
  readonly feature: string;

  @ManyToOne(() => TypeOrmBannerEntity, (item) => item.clustering)
  @JoinColumn({ name: 'id_message' })
  readonly banner: Relation<TypeOrmBannerEntity>;

  @ManyToOne(() => TypeOrmSlideEntity, (item) => item.clustering)
  @JoinColumn({ name: 'id_message' })
  readonly slide: Relation<TypeOrmSlideEntity>;

  @OneToMany(
    () => TypeOrmClusteringCustEntity,
    (clustering) => clustering.clusteringFirebase,
  )
  readonly clusteringCust: Relation<TypeOrmClusteringCustEntity[]>;
}
