import { DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ExternalDivisionType } from '@wings-online/app.constants';
import { CacheUtil, UserIdentity } from '@wings-online/common';

import { MAX_CACHE_TTL_MS } from '../banner.constants';
import { TypeOrmVideoEntity } from '../entities';
import { IVideoReadRepository } from '../interfaces';
import { VideoReadModel } from '../read-models';

@Injectable()
export class TypeOrmVideoReadRepository implements IVideoReadRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listVideos(identity: UserIdentity): Promise<VideoReadModel[]> {
    const { type } = identity.division;

    const uniqueVideosQuery = this.dataSource
      .createQueryBuilder(TypeOrmVideoEntity, 'video')
      .select(['video.id'])
      .distinctOn(['video.url'])
      .andWhere('video.isShown is true')
      .andWhere(`date_trunc('day', video.releaseFrom) <= now()`)
      .andWhere(
        `(date_trunc('day', video.releaseTo) + interval '1 day') > now()`,
      )
      .andWhere('video.entity = :entity', { entity: identity.organization });

    if (type === 'DRY' || type === 'FROZEN') {
      uniqueVideosQuery.andWhere('video.division = :videoType', {
        videoType:
          type === 'DRY'
            ? ExternalDivisionType.DRY
            : ExternalDivisionType.FROZEN,
      });
      uniqueVideosQuery.cache(
        CacheUtil.getCacheKey(
          `videos:${identity.organization}:division:${
            type === 'DRY'
              ? ExternalDivisionType.DRY
              : ExternalDivisionType.FROZEN
          }`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    } else {
      uniqueVideosQuery.cache(
        CacheUtil.getCacheKey(`videos:${identity.organization}:division:all`),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const uniqueVideos = await uniqueVideosQuery.getMany();

    if (uniqueVideos.length <= 0) return [];

    const query = this.dataSource
      .createQueryBuilder(TypeOrmVideoEntity, 'video')
      .innerJoin('video.sequence', 'sequence')
      .andWhere('video.id in (:...ids)', {
        ids: uniqueVideos.map((x) => x.id),
      });

    if (type === 'DRY' || type === 'FROZEN') {
      query.addOrderBy('sequence.seq', 'ASC');
    } else {
      query
        .addOrderBy(
          'ROW_NUMBER() OVER (PARTITION BY video.division ORDER BY sequence.seq)',
          'ASC',
        )
        .addOrderBy('video.division', 'DESC');
    }

    const entities = await query.getMany();

    return entities.map((entity) => ({
      description: entity.description,
      url: entity.url,
    }));
  }
}
