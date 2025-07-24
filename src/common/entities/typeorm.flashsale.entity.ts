import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'sales', name: 'promo_cms' })
export class TypeOrmFlashsaleEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly type: string;

  @Column({ type: 'timestamptz' })
  readonly periodFrom: Date;

  @Column({ type: 'timestamptz' })
  readonly periodTo: Date;

  @Column({ name: 'entity' })
  readonly organization: string;
}
