import { Column, Entity, OneToOne, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmVideoSequenceEntity } from './typeorm.video-sequence.entity';

@Entity({ schema: 'public', name: 'm_video_content' })
export class TypeOrmVideoEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'desc' })
  readonly description: string;

  @Column({ select: false })
  readonly entity: string;

  @Column({ name: 'div', select: false })
  readonly division: string;

  @Column({ name: 'url_youtube' })
  readonly url: string;

  @Column({ select: false })
  readonly releaseFrom: Date;

  @Column({ select: false })
  readonly releaseTo: Date;

  @Column({ name: 'shown', select: false })
  readonly isShown: boolean;

  @OneToOne(() => TypeOrmVideoSequenceEntity, 'video')
  readonly sequence: Relation<TypeOrmVideoSequenceEntity>;
}
