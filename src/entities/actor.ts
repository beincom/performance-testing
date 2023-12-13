import { CONFIGS } from '../../config';
import {
  generateCommunityName,
  generateGroupName,
  generateGroupSeed,
} from '../../scripts/seed/group-seed-generator';
import { generateUserNameSeed } from '../../scripts/seed/user-seed-generator';
import { COMMON_CONFIG, SERVICE } from '../common';
import { GET } from '../utils/http.utils';
import { rand } from '../utils/utils';

type TestUserLocator = {
  communityIndex: number;
  communityName: string;
  groupIndex: number;
  groupName: string;
  username: string;
};

function getActor(locator?: { communityIndex?: number; groupIndex?: number }): TestUserLocator {
  const groupIndex = locator?.groupIndex ?? rand(CONFIGS.NUMBER_OF_GROUPS_IN_COMMUNITY);
  const communityIndex = locator?.communityIndex ?? rand(CONFIGS.NUMBER_OF_COMMUNITIES);

  const groupData = generateGroupSeed(communityIndex, groupIndex);

  const pickedUser = groupData.members[rand(groupData.admins.length - 1)];
  let userIndex: number = 0;

  if (pickedUser) {
    userIndex = +pickedUser.username.substring(CONFIGS.USERNAME_PREFIX.length);
    if (userIndex <= CONFIGS.NUMBER_OF_USERS) {
      return {
        username: generateUserNameSeed(userIndex),
        communityIndex,
        groupIndex,
        communityName: generateCommunityName(communityIndex),
        groupName: generateGroupName(groupIndex),
      };
    }
  }

  throw new Error(
    'Test user not found: ' + JSON.stringify({ communityIndex, groupIndex, userIndex }, null, 2)
  );
}

export class Actor {
  public username: string;
  public groupName: string;
  public communityName: string;

  private constructor(data: { username: string }) {
    this.username = data.username;
  }

  public static init(): Actor {
    const seedActor = getActor();
    const actor = new Actor({ username: seedActor.username });

    actor.groupName = seedActor.groupName;
    actor.communityName = seedActor.communityName;

    return actor;
  }

  public async getNewsfeed(): Promise<any> {
    return GET({
      actorUsername: this.username,
      url: `${SERVICE.CONTENT.HOST}/newsfeed?limit=20`,
      headers: { [COMMON_CONFIG.HEADER_KEY.VER]: SERVICE.CONTENT.LATEST_VER },
    });
  }

  public async getContentDetail(contentId: string, contentType: string): Promise<any> {
    switch (contentType) {
      case 'POST': {
        return GET({
          actorUsername: this.username,
          url: `${SERVICE.CONTENT.HOST}/posts/${contentId}`,
          headers: {
            [COMMON_CONFIG.HEADER_KEY.VER]: SERVICE.CONTENT.LATEST_VER,
          },
        });
      }

      case 'ARTICLE': {
        return GET({
          actorUsername: this.username,
          url: `${SERVICE.CONTENT.HOST}/articles/${contentId}`,
          headers: {
            [COMMON_CONFIG.HEADER_KEY.VER]: SERVICE.CONTENT.LATEST_VER,
          },
        });
      }

      case 'SERIES': {
        return GET({
          actorUsername: this.username,
          url: `${SERVICE.CONTENT.HOST}/series/${contentId}`,
          headers: {
            [COMMON_CONFIG.HEADER_KEY.VER]: SERVICE.CONTENT.LATEST_VER,
          },
        });
      }

      default: {
        return null;
      }
    }
  }
}
