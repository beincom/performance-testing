import { check, group, sleep } from 'k6';

import { API_KEYS } from '../constants/api-keys.const';
import { Actor } from '../entities/actor';
import { ContentDetailScreenAPI } from '../screens/content-detail.screen';
import { HomeScreenAPI } from '../screens/home.screen';
import { ScreenBrowser } from '../utils/screen.util';
import { generateRandomNumber } from '../utils/utils';

export async function newsfeedScenario(): Promise<void> {
  await group('NewsfeedSession', async () => {
    const actor = Actor.init();
    const browser = new ScreenBrowser();

    /**
     * Go to the home screen
     */
    const homeScreen = HomeScreenAPI({ actor });
    const homeScreenResults = await browser.gotoScreen(homeScreen);

    const contentsInNewsfeed = homeScreenResults.get(API_KEYS.NEWSFEED).data.list;
    // console.log('contentsInNewsfeed=====>', contentsInNewsfeed);

    if (!contentsInNewsfeed?.length) {
      return check(null, {
        'Get newsfeed': () => false,
      });
    }

    sleep(generateRandomNumber(0, 10000));

    const pickedContent =
      contentsInNewsfeed[generateRandomNumber(0, contentsInNewsfeed.length - 1)];

    /**
     * Go to content detail screen
     */
    const contentDetailScreen = ContentDetailScreenAPI({
      actor,
      contentId: pickedContent.id,
      contentType: pickedContent.type,
    });
    const contentDetailScreenResults = await browser.gotoScreen(contentDetailScreen);

    const contentDetail = contentDetailScreenResults.get(API_KEYS.CONTENT_DETAIL).data;

    if (!contentDetail) {
      return check(null, {
        'Get content detail': () => false,
      });
    }
  });
}
