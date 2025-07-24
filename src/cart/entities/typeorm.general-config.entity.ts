import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_general_info' })
export class TypeOrmGeneralConfigEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column()
  readonly group: string;

  @Column()
  readonly key: string;

  @Column()
  readonly value: string;
}
