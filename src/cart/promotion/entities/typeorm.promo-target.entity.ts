import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'sales', name: 'promo_target' })
export class TypeOrmPromoTargetEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly buyerId: string;

  @Column({ type: 'timestamptz' })
  readonly periodFrom: Date;

  @Column({ type: 'timestamptz' })
  readonly periodTo: Date;
}
