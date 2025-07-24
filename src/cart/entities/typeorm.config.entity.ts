import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'sales', name: 'config' })
export class TypeOrmConfigEntity {
  @PrimaryColumn()
  readonly key: string;

  @Column()
  readonly value: string;
}
