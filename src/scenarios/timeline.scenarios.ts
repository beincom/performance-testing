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

export async function timelineScenario(): Promise<void> {
  await group('TimelineSession', async () => {
    const actor = Actor.init();

    const joinedCommunitiesResult = await actor.getJoinedCommunities();
    if (!joinedCommunitiesResult?.data) {
      return check(null, {
        'Get joined communities': () => false,
      });
    }

    const pickedCommunity =
      joinedCommunitiesResult.data[
        generateRandomNumber(0, joinedCommunitiesResult.data.length - 1)
      ];

    const randomGetTimelineTimes = generateRandomNumber(1, 5);

    let hasNextPage = true;
    let endCursor;

    for (let i = 0; i < randomGetTimelineTimes; i++) {
      if (hasNextPage) {
        const timelineResult = await actor.getTimeline(pickedCommunity.group_id, endCursor);
        if (!timelineResult?.data) {
          return check(null, {
            'Get timeline': () => false,
          });
        }

        if (timelineResult.data.list.length) {
          await demoPickContent(actor, timelineResult.data.list);
        }

        hasNextPage = timelineResult.meta.has_next_page;
        endCursor = timelineResult.meta.end_cursor;

        sleep(generateRandomNumber(0, 5000));
      }
    }
  });
}
