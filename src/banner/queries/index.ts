import { GetSuggestionBannerController } from './get-suggestion-banner/get-suggestion-banner.controller';
import { GetSuggestionBannerHandler } from './get-suggestion-banner/get-suggestion-banner.handler';
import { ListBannersController } from './list-banners/list-banners.controller';
import { ListBannersHandler } from './list-banners/list-banners.handler';
import { ListSlidersController, ListSlidersHandler } from './list-sliders';
import { ListVideoController } from './list-video/list-video.controller';
import { ListVideoHandler } from './list-video/list-video.handler';

export const QueryHandlers = [
  ListBannersHandler,
  ListVideoHandler,
  ListSlidersHandler,
  GetSuggestionBannerHandler,
];

export const QueryControllers = [
  ListBannersController,
  ListVideoController,
  ListSlidersController,
  GetSuggestionBannerController,
];
