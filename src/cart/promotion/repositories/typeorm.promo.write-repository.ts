import { EntityId, Money } from '@wings-corporation/domain';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import {
  IPromoWriteRepository,
  LegacyLoyaltyStatus,
  LoyaltyPromo,
  LoyaltyPromoCondition,
  LoyaltyPromoCriteria,
  TypeOrmPromoLoyaltyEntity,
} from '@wings-online/cart/promotion';
import {
  MinimumPurchaseAmountCriterion,
  UserIdentity,
} from '@wings-online/common';

export class TypeOrmPromoWriteRepository implements IPromoWriteRepository {
  constructor(private readonly uowService: TypeOrmUnitOfWorkService) {}

  async getLoyaltyPromo(
    identity: UserIdentity,
  ): Promise<LoyaltyPromo | undefined> {
    const { dry, frozen } = identity.division;

    const entity = await this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmPromoLoyaltyEntity, 'loyalty')
      .innerJoinAndSelect('loyalty.targets', 'targets')
      .where('targets.salesOffice in (:...keys)', {
        keys: new Array()
          .concat(dry ? dry.salesOffice : [])
          .concat(frozen ? frozen.salesOffice : []),
      })
      .andWhere('targets.group in (:...groups)', {
        groups: new Array()
          .concat(dry ? dry.group : [])
          .concat(frozen ? frozen.group : []),
      })
      .andWhere('loyalty.periodFrom <= now()')
      .andWhere('loyalty.periodTo >= now()')
      .andWhere('loyalty.status = :status', {
        status: 'Active' as LegacyLoyaltyStatus,
      })
      .getOne();

    if (!entity) return;

    const criteria: LoyaltyPromoCriteria = {
      criterion: MinimumPurchaseAmountCriterion.create(
        entity.minPurchaseAmount,
      ),
      benefit: {
        coin:
          entity.benefitType === 'COIN'
            ? {
                type: 'AMOUNT',
                value: Money.create(entity.benefitValue),
              }
            : undefined,
        creditMemo:
          entity.benefitType === 'CREDIT_MEMO'
            ? {
                type: 'AMOUNT',
                value: Money.create(entity.benefitValue),
              }
            : undefined,
      },
    };
    const condition: LoyaltyPromoCondition = {
      type: 'OneOf',
      criteria: [criteria],
    };

    return {
      id: EntityId.fromString(entity.id),
      type: 'LYL',
      condition,
    };
  }
}
