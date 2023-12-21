import { CONFIGS } from '../../config';
import { generateUserNameSeed } from '../../scripts/seed/user-seed-generator';
import { COMMON_CONFIG, SERVICE } from '../common';
import { GET } from '../utils/http.utils';
import { rand } from '../utils/utils';

export class Actor {
  public username: string;

  private constructor(data: { username: string }) {
    this.username = data.username;
  }

  public static init(): Actor {
    const randomUserIndex = rand(CONFIGS.NUMBER_OF_USERS);
    const username = generateUserNameSeed(randomUserIndex);
    const actor = new Actor({ username });

    return actor;
  }

  public getJoinedCommunities(): Promise<{
    data: { id: string; group_id: string; name: string }[];
  }> {
    return GET({
      actorUsername: this.username,
      url: `${SERVICE.GROUP.HOST}/me/communities?limit=500`,
    });
  }

  public async getNewsfeed(after?: string): Promise<any> {
    let url = `${SERVICE.CONTENT.HOST}/newsfeed?limit=20`;
    if (after) {
      url += `&after=${after}`;
    }
    return GET({
      actorUsername: this.username,
      url,
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

  public async getComments(contentId: string, after?: string): Promise<any> {
    let url = `${SERVICE.CONTENT.HOST}/comments?post_id=${contentId}&limit=20`;
    if (after) {
      url += `&after=${after}`;
    }
    return GET({
      actorUsername: this.username,
      url,
      headers: { [COMMON_CONFIG.HEADER_KEY.VER]: SERVICE.CONTENT.LATEST_VER },
    });
  }

  public async getTimeline(groupId: string, after?: string): Promise<any> {
    let url = `${SERVICE.CONTENT.HOST}/timeline/${groupId}?limit=20`;
    if (after) {
      url += `&after=${after}`;
    }
    return GET({
      actorUsername: this.username,
      url,
      headers: { [COMMON_CONFIG.HEADER_KEY.VER]: SERVICE.CONTENT.LATEST_VER },
    });
  }
}
