import { check, group, sleep } from 'k6';

import { Actor } from '../entities/actor';
import { generateRandomNumber } from '../utils/utils';

async function demoPickContent(actor: Actor, contents: any[]): Promise<any> {
  const numberOfContents = contents.length;
  const randomPickContentTimes = generateRandomNumber(1, numberOfContents);

  for (let j = 0; j < randomPickContentTimes; j++) {
    const pickedContent = contents[generateRandomNumber(0, numberOfContents - 1)];

    const contentDetailResult = await actor.getContentDetail(pickedContent.id, pickedContent.type);
    if (!contentDetailResult?.data) {
      return check(null, {
        'Get content detail': () => false,
      });
    }

    sleep(generateRandomNumber(0, 5000));

    const commentsResult = await actor.getComments(pickedContent.id);
    if (!commentsResult?.data) {
      return check(null, {
        'Get comments': () => false,
      });
    }
  }
}

export async function newsfeedScenario(): Promise<void> {
  await group('NewsfeedSession', async () => {
    const actor = Actor.init();

    const randomGetNewsfeedTimes = generateRandomNumber(1, 5);

    let hasNextPage = true;
    let endCursor;

    for (let i = 0; i < randomGetNewsfeedTimes; i++) {
      if (hasNextPage) {
        const newsfeedResult = await actor.getNewsfeed(endCursor);
        if (!newsfeedResult?.data) {
          return check(null, {
            'Get newsfeed': () => false,
          });
        }

        // if (newsfeedResult.data.list.length) {
        //   await demoPickContent(actor, newsfeedResult.data.list);
        // }

        hasNextPage = newsfeedResult.meta.has_next_page;
        endCursor = newsfeedResult.meta.end_cursor;

        sleep(generateRandomNumber(0, 5000));
      }
    }
  });
}