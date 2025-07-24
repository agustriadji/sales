// import { PromotionType } from '@wings-online/app.constants';
// import { Entity, EntityId } from '@wings-corporation/domain';
// import { LoyaltyPromoCondition } from '@wings-online/promotion';

// export type LoyaltyProps = {
//   condition: LoyaltyPromoCondition;
// };

// export class Loyalty extends Entity<LoyaltyProps, string> {
//   private constructor(props: LoyaltyProps, id: EntityId<string>) {
//     super(props, id);
//   }

//   public static create(props: LoyaltyProps, id: EntityId<string>): Loyalty {
//     return new Loyalty(props, id);
//   }

//   get type(): string {
//     return PromotionType.LOYALTY;
//   }

//   get condition(): LoyaltyPromoCondition {
//     return this._props.condition;
//   }

//   // benefitOf(total: Money): PromoBenefit | undefined {
//   //   const matched = this._props.condition.criteria.find((criteria) => {
//   //     if (criteria.criterion instanceof MinimumPurchaseAmountCriterion) {
//   //       return criteria.criterion.check(total);
//   //     }
//   //   });

//   //   return matched?.benefit;
//   // }
// }
