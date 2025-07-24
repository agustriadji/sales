import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'slide_criteria' })
export class TypeOrmSlideCriteriaEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column({ name: 'image_slide' })
  readonly image: string;

  @Column({ name: 'kategori' })
  readonly category: string;

  @Column({ type: 'int' })
  readonly seq: number;

  @Column()
  readonly isShown: boolean;

  @Column()
  readonly isDelete: boolean;
}
