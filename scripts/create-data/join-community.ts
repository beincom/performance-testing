import { User, randomSleep } from '../http/http-service';
import { generateUserNameSeed } from '../seed/user-seed-generator';
import { makeArrayFromRange } from '../utils/utils';

import communities from './communities.json';

export interface ISeedCommunity {
  name: string;
  id: string;
  groupId: string;
  userId: string;
  username: string;
  imageId: string;
  memberRange: number[];
  numOfPosts: number;
  numOfArticles: number;
  numOfSeries: number;
}

export async function setupCommunityMembers(): Promise<void> {
  console.log({ step: 'START' });

  for (const community of communities) {
    await joinCommunity(community as unknown as ISeedCommunity);
  }

  return console.log({ step: 'FINISHED' });
}

async function joinCommunity(community: ISeedCommunity): Promise<void> {
  const expectedMemberUsernames = makeArrayFromRange(
    community.memberRange[0],
    community.memberRange[1]
  ).map(generateUserNameSeed);

  if (expectedMemberUsernames.length) {
    const communityOwner = await User.init({ username: community.username });

    await Promise.all(
      expectedMemberUsernames.map(async (username) => {
        const sleep = await randomSleep();
        const user = await User.init({ username });
        await user.joinGroup(community.groupId);
        user.cleanUp();
        console.log(`joinCommunity - ${community.name} - ${username} - ${sleep}`);
      })
    );

    communityOwner.cleanUp();
  }
}
