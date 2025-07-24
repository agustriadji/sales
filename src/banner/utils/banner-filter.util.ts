import { FilterCondition } from '@wings-online/common';

import { BannerPage, BannerPageType } from '../banner.constants';

export class BannerFilterUtil {
  public static getFilteredPages(pageName?: FilterCondition<string>): {
    [BannerPageType.GENERAL]: BannerPage[];
    [BannerPageType.BRAND]: BannerPage[];
    [BannerPageType.CATEGORY]: BannerPage[];
  } {
    const pages: Record<BannerPageType, BannerPage[]> = {
      [BannerPageType.GENERAL]: [],
      [BannerPageType.BRAND]: [],
      [BannerPageType.CATEGORY]: [],
    };

    const defaultGeneralPages = [
      BannerPage.PROMO,
      BannerPage.RECOMMENDATION,
      BannerPage.SKU_ORDER,
      BannerPage.FAVORITE,
      BannerPage.NEW_PRODUCT,
      BannerPage.HOME,
      BannerPage.PROMO_PRODUCT,
      BannerPage.PRODUCT_DETAIL,
    ];
    const defaultBrandPages = [BannerPage.BRAND];
    const defaultCategoryPages = [BannerPage.CATEGORY];

    if (pageName) {
      const filteredPages: BannerPage[] = [];
      if (pageName.equals) {
        filteredPages.push(pageName.equals as BannerPage);
      } else if (pageName.in) {
        filteredPages.push(...(pageName.in as BannerPage[]));
      }

      for (const page of filteredPages) {
        if (defaultGeneralPages.includes(page)) {
          pages[BannerPageType.GENERAL].push(page);
        } else if (defaultBrandPages.includes(page)) {
          pages[BannerPageType.BRAND].push(page);
        } else if (defaultCategoryPages.includes(page)) {
          pages[BannerPageType.CATEGORY].push(page);
        }
      }
    } else {
      pages[BannerPageType.GENERAL].push(...defaultGeneralPages);
      pages[BannerPageType.BRAND].push(...defaultBrandPages);
      pages[BannerPageType.CATEGORY].push(...defaultCategoryPages);
    }

    return pages;
  }
}
