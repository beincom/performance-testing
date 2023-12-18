import { ORDER, ROLE_TYPE } from '@beincom/constants';
import axios from 'axios';

import { CONFIGS } from '../../config';

import { HttpAdapter } from './http.adapter';

interface ICognitoToken {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface IHttpServiceOption {
  apiEndpoint?: string;
  token: ICognitoToken;
  username: string;
  password?: string;
}

export type QueryParams = {
  key?: string;
  offset?: number;
  limit?: number;
  sort?: Array<[any, ORDER]>;
  cursor?: string;
};

class HttpService {
  public static retryInterval;
  private readonly _token: ICognitoToken;
  private interval;

  public http: HttpAdapter;
  public readonly options: IHttpServiceOption;

  public constructor(options: IHttpServiceOption) {
    this.options = options;
    this._token = options.token;
    this.autoRefreshToken();

    this.http = new HttpAdapter({
      baseURL: options.apiEndpoint,
      headers: {
        authorization: this._token.idToken,
      },
    });
  }

  private autoRefreshToken(): void {
    this.interval = setInterval(
      this.refreshToken.bind(this),
      Math.ceil(this._token.expiresIn * 1000) / 2
    );
  }

  public cleanUp(): void {
    clearInterval(this.interval);
  }

  public async sendRequestAndRetry(cb, retryCount: number = 0): Promise<any> {
    try {
      const res = await cb();

      if (HttpService.retryInterval) {
        clearInterval(HttpService.retryInterval);
        HttpService.retryInterval = undefined;
      }
      return res;
    } catch (e) {
      const knownCodes = [
        'EBUSY',
        'EMFILE',
        'EPROTO',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNRESET',
        'ERR_SSL_WRONG_VERSION_NUMBER',
        'ERR_SSL_PACKET_LENGTH_TOO_LONG',
        'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC',
      ];
      const shouldRetry =
        knownCodes.includes(e.code) ||
        e.response?.status >= 500 ||
        e.response?.status === 401 ||
        e.response?.data.code === 'forbidden';

      if (shouldRetry) {
        if (retryCount >= 10) {
          if (knownCodes.includes(e.code)) {
            console.log({
              step: 'exhaustiveRetry',
              code: e.code,
              status: e.response?.status,
              method: e.config?.method,
              url: e.config?.url,
              data: e.config?.data,
            });
            await randomSleep(30000);
            return this.sendRequestAndRetry(cb, 0);
          }
          throw e;
        }

        retryCount += 1;
        console.log({
          step: 'sendRequestAndRetry',
          retryCount,
          status: e.response?.status,
          method: e.config?.method,
          url: e.config?.url,
          data: e.config?.data,
        });
        if (!HttpService.retryInterval) {
          HttpService.retryInterval = setInterval(() => process.stdout.write('.'), 1000);
        }

        await sleep(30000 * retryCount);

        if (e.response?.status === 401) {
          await this.refreshToken(retryCount);
        }

        return this.sendRequestAndRetry(cb, retryCount);
      } else {
        if (!e.response) {
          throw e;
        }

        const knownErrorCodes = [
          'group.already_member',
          'group.joining_request.already_sent',
          'data_synchronization.error',
        ];
        if (!knownErrorCodes.includes(e.response.data.code)) {
          console.error('UNKNOWN_ERROR_CODE:');
          console.error(e.response.data);
          throw e;
        }
      }
    }
  }

  public static async getToken(
    username: string,
    password: string,
    options?: { userPool: string; clientId: string },
    retryCount: number = 0
  ): Promise<ICognitoToken> {
    try {
      const res = await axios.post(
        'https://cognito-idp.ap-southeast-1.amazonaws.com',
        {
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: options?.clientId || CONFIGS.COGNITO_CLIENT_ID,
        },
        {
          headers: {
            Accept: '*/*',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            'Content-Type': 'application/x-amz-json-1.1',
          },
        }
      );

      return {
        idToken: res.data.AuthenticationResult.IdToken,
        accessToken: res.data.AuthenticationResult.AccessToken,
        refreshToken: res.data.AuthenticationResult.RefreshToken,
        expiresIn: res.data.AuthenticationResult.ExpiresIn,
        tokenType: res.data.AuthenticationResult.TokenType,
      };
    } catch (e) {
      if (retryCount < 6) {
        await sleep(3000);
        return HttpService.getToken(username, password, options, (retryCount += 1));
      } else {
        console.error(e.response?.data ?? e.response ?? e);
        throw new Error(`Cannot get token for user: ${username}`);
      }
    }
  }

  private async refreshToken(retryCount: number = 0): Promise<void> {
    try {
      const res = await axios.post(
        'https://cognito-idp.ap-southeast-1.amazonaws.com',
        {
          AuthParameters: {
            REFRESH_TOKEN: this._token.refreshToken,
          },
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: CONFIGS.COGNITO_CLIENT_ID,
        },
        {
          headers: {
            Accept: '*/*',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            'Content-Type': 'application/x-amz-json-1.1',
          },
        }
      );
      const newToken = {
        idToken: res.data.AuthenticationResult.IdToken,
        accessToken: res.data.AuthenticationResult.AccessToken,
      };

      Object.assign(this._token, newToken);
      this.http.setHeader({
        authorization: newToken.idToken,
      });
    } catch (e) {
      if (retryCount < 6) {
        retryCount++;
        await sleep(5000 * retryCount);
        await this.refreshToken(retryCount);
      } else {
        console.error(e);
        throw new Error(`Cannot refresh token for user: ${this.options.username}`);
      }
    }
  }
}

export type IUser = {
  id: string;
  username: string;
  email: string;
  password: string;
};

export type Community = {
  id: string;
  name: string;
  privacy: string;
  group_id: string;
  owner_id: string;
};

export class User extends HttpService {
  public username: string;
  public constructor(options: IHttpServiceOption) {
    super(options);
    this.username = options.username;
  }

  public static async init(options: Omit<IHttpServiceOption, 'token'>): Promise<User> {
    const token = await HttpService.getToken(
      options.username,
      options.password ?? CONFIGS.DEFAULT_PASSWORD,
      {
        clientId: CONFIGS.COGNITO_CLIENT_ID,
        userPool: CONFIGS.COGNITO_USER_POOL,
      }
    );

    options.apiEndpoint = options.apiEndpoint ?? CONFIGS.API_ENDPOINT;
    return new User({ ...options, token });
  }

  public async getInvitations(communityId: string, params: QueryParams): Promise<{ id: string }[]> {
    const res = await this.sendRequestAndRetry(async () =>
      this.http.get(`group/manage/communities/${communityId}/invitations`, {
        params,
        headers: {
          'x-version-id': '1.1.0',
        },
      })
    );

    return res.data.data;
  }

  public async cancelInvitation(invitationId: string): Promise<void> {
    return this.sendRequestAndRetry(async () =>
      this.http.put(`group/invitations/${invitationId}/cancel`, {})
    );
  }

  public async approveAllJoinRequests(groupId: string): Promise<void> {
    return this.sendRequestAndRetry(async () =>
      this.http.put(`group/groups/${groupId}/join-requests/approve`, {})
    );
  }

  public async getInternalGroupMembers(body: unknown): Promise<{
    data: string[];
    meta: {
      cursors: {
        prev: string;
        next: string;
      };
    };
  }> {
    const res = await this.sendRequestAndRetry(async () =>
      this.http.post('internal/groups/ids/users', body, {
        baseURL: 'http://api.beincom.io.private/v1/group',
      })
    );

    return res.data;
  }

  public async removeGroupMembersAsManager(
    communityId: string,
    groupId: string,
    userIds: string[]
  ): Promise<{
    group_admin: { data: IUser[] };
    group_member: { data: IUser[] };
  }> {
    const res = await this.sendRequestAndRetry(async () =>
      this.http.put(`group/manage/communities/${communityId}/groups/${groupId}/users/remove`, {
        userIds,
      })
    );

    return res.data.data;
  }

  public async revokeCommunityAdmin(userIds: string[], communityId: string): Promise<void> {
    return this.sendRequestAndRetry(async () =>
      this.http.put(`group/communities/${communityId}/revoke-admin`, {
        userIds,
      })
    );
  }

  public async joinGroup(groupId: string): Promise<void> {
    return this.sendRequestAndRetry(async () =>
      this.http.post(
        `group/groups/${groupId}/join`,
        {},
        {
          headers: {
            'x-version-id': '1.1.0',
          },
        }
      )
    );
  }

  public async assignCommunityAdmin(userIds: string[], communityId: string): Promise<void> {
    return this.sendRequestAndRetry(async () =>
      this.http.put(`group/communities/${communityId}/assign-admin`, {
        userIds,
      })
    );
  }

  public async createDraftPost(groupIds: string[]): Promise<{ id: string }> {
    const res = await this.sendRequestAndRetry(async () =>
      this.http.post(
        'content/posts',
        { audience: { group_ids: groupIds } },
        { headers: { 'x-version-id': '1.12.0' } }
      )
    );
    return res.data.data;
  }

  public async publishPost(postId: string, content: string): Promise<void> {
    return this.sendRequestAndRetry(async () =>
      this.http.put(
        `content/posts/${postId}/publish`,
        { content },
        { headers: { 'x-version-id': '1.12.0' } }
      )
    );
  }
}

export class SysAdmin extends User {
  public constructor(options: IHttpServiceOption) {
    super(options);
  }

  public static async init(): Promise<SysAdmin> {
    const token = await HttpService.getToken(CONFIGS.SYS_ADMIN_USER_NAME, CONFIGS.DEFAULT_PASSWORD);
    return new SysAdmin({
      username: CONFIGS.SYS_ADMIN_USER_NAME,
      password: CONFIGS.DEFAULT_PASSWORD,
      apiEndpoint: CONFIGS.API_ENDPOINT,
      token,
    });
  }

  public async findCommunityByName(name: string): Promise<Community> {
    try {
      const res = await this.http.get('/group/admin/communities', {
        params: {
          key: name,
          offset: 0,
          limit: 10,
          sort: 'name:asc',
        },
      });

      return res.data.data.find((community: any) => community.name === name);
    } catch (e) {
      console.error('findCommunityByName', e.response);
      throw new Error(`Cannot find the community with name: ${name}`);
    }
  }

  public async getUsersByUsernames(usernames: string[]): Promise<IUser[]> {
    return Promise.all(usernames.map(async (username) => this.getUserByUsername(username)));
  }

  public async getUserByUsername(username: string): Promise<IUser> {
    const res = await this.sendRequestAndRetry(async () =>
      this.http.get(`user/users/${username}/profile?type=username`)
    );
    return res.data.data;
  }

  public async getInternalUsersByIds(ids: string[]): Promise<IUser[]> {
    const res = await this.sendRequestAndRetry(async () =>
      this.http.post('internal/users/ids?deactivated=included', ids, {
        baseURL: 'http://api.beincom.io.private/v1/user',
      })
    );

    return res.data.data;
  }

  public async findUsersInGroupsByRoles(
    groupIds: string[],
    roles: ROLE_TYPE[]
  ): Promise<Record<ROLE_TYPE, Record<string, string[]>>> {
    const res = await this.sendRequestAndRetry(async () =>
      this.http.post(
        'internal/groups/users',
        { groupIds, roles },
        {
          baseURL: 'http://api.beincom.io.private/v1/group',
        }
      )
    );

    return res.data.data;
  }
}

export function sleep(milliseconds: number): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(1);
    }, milliseconds);
  });
}

export async function randomSleep(ms: number = 10000): Promise<number> {
  const duration = Math.floor(Math.random() * ms);
  await new Promise((r) => setTimeout(r, duration));
  return duration;
}