import { DateTime } from 'luxon';

import { Division, DivisionEnum } from '@wings-corporation/core';
import { ReadModel } from '@wings-online/common';

type SuggestionBannerReadModelProps = {
  buyerInfo: {
    type: Division;
    closeSuggestionBannerAt: Date;
  }[];
  suggestionBannerReshowConfig: Record<Division, number>;
};

export type JsonSuggestionBannerProps = {
  dry: boolean;
  frozen: boolean;
};

export class SuggestionBannerReadModel extends ReadModel {
  constructor(private readonly props: SuggestionBannerReadModelProps) {
    super();
  }

  private hasDivision(division: Division) {
    const { buyerInfo } = this.props;
    return buyerInfo.some((info) => info.type === division);
  }

  private shouldShowBanner(division: Division) {
    const { buyerInfo, suggestionBannerReshowConfig } = this.props;

    const buyer = buyerInfo.find((info) => info.type !== division);
    if (!buyer || !buyer.closeSuggestionBannerAt) return true;

    const closeAt = DateTime.fromJSDate(buyer.closeSuggestionBannerAt);

    return (
      DateTime.now().diff(closeAt, 'days').days >=
      suggestionBannerReshowConfig[division]
    );
  }

  toJSON(): JsonSuggestionBannerProps {
    const hasDry = this.hasDivision(DivisionEnum.DRY);
    const hasFrozen = this.hasDivision(DivisionEnum.FROZEN);

    // User is registered in both divisions, don't show any banner
    if (hasDry && hasFrozen) {
      return { dry: false, frozen: false };
    }

    return {
      dry: hasDry ? false : this.shouldShowBanner(DivisionEnum.DRY),
      frozen: hasFrozen ? false : this.shouldShowBanner(DivisionEnum.FROZEN),
    };
  }
}
