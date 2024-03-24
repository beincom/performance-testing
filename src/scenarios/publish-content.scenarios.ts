/* eslint-disable @typescript-eslint/ban-ts-comment */
import { check, group, sleep } from 'k6'; // @ts-ignore
import httpagg from 'k6/x/httpagg';

import sampleContents from '../../seed/sample-contents.json';
import { Actor } from '../entities/actor';
import { generateRandomNumber } from '../utils/utils';

export async function publishContentScenario(): Promise<void> {
  const vuID = __VU; // Get current virtual user's id

  await group('PublishContentSession', async () => {
    const actor = Actor.init(vuID);

    const randomPublishContentTimes = generateRandomNumber(1, 5);

    for (let i = 0; i < randomPublishContentTimes; i++) {
      const content = sampleContents[generateRandomNumber(0, sampleContents.length - 1)];

      const { postId, groupIds } = await createDraftPost(actor);
      await demoSaveDraftPost(actor, { postId, groupIds, content: content.content });
      await publishPost(actor, { postId, groupIds, content: content.content });

      if (i < randomPublishContentTimes - 1) {
        // Wait for a while before publishing another content
        sleep(generateRandomNumber(300, 600));
      }
    }
  });
}

async function createDraftPost(actor: Actor): Promise<{ postId: string; groupIds: string[] }> {
  const audienceGroupsResult = await actor.getPostAudienceGroups();
  const audienceGroupsResultStatus = check(audienceGroupsResult, {
    '[audienceGroupsResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(audienceGroupsResult, audienceGroupsResultStatus, {
    fileName: 'dashboard/httpagg-audienceGroupsResult.json',
    aggregateLevel: 'onError',
  });

  const audienceGroups = audienceGroupsResult?.data || [];

  if (!audienceGroups.length) {
    throw new Error('No audience group found');
  }

  const pickedGroups = audienceGroups.slice(0, generateRandomNumber(1, audienceGroups.length));
  const pickedGroupIds = pickedGroups.map((group) => group.id);

  const createDraftPostResult = await actor.createDraftPost(pickedGroupIds);
  const createDraftPostResultStatus = check(createDraftPostResult, {
    '[createDraftPostResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(createDraftPostResult, createDraftPostResultStatus, {
    fileName: 'dashboard/httpagg-createDraftPostResult.json',
    aggregateLevel: 'onError',
  });

  if (!createDraftPostResult?.data) {
    throw new Error('Failed to create draft post');
  }

  return { postId: createDraftPostResult.data.id, groupIds: pickedGroupIds };
}

async function demoSaveDraftPost(
  actor: Actor,
  data: { postId: string; groupIds: string[]; content: string }
): Promise<void> {
  const { postId, groupIds, content } = data;

  const saveDraftPostTimes = 50;
  const contentParts = splitContentIntoParts(content, saveDraftPostTimes);

  for (let i = 0; i < saveDraftPostTimes; i++) {
    // Type content into the editor
    sleep(5);

    // Save draft post
    const saveDraftPostResult = await actor.saveDraftPost(postId, {
      groupIds,
      content: contentParts[i],
    });
    const saveDraftPostResultStatus = check(saveDraftPostResult, {
      '[saveDraftPostResult] code was api.ok': (res) => res?.code == 'api.ok',
    });
    httpagg.checkRequest(saveDraftPostResult, saveDraftPostResultStatus, {
      fileName: 'dashboard/httpagg-saveDraftPostResult.json',
      aggregateLevel: 'onError',
    });
  }
}

async function publishPost(
  actor: Actor,
  data: { postId: string; groupIds: string[]; content: string }
): Promise<void> {
  const { postId, groupIds, content } = data;

  // Simulate user reviewing the post
  sleep(generateRandomNumber(10, 60));

  const publishPostResult = await actor.publishPost(postId, { groupIds, content });
  const publishPostResultStatus = check(publishPostResult, {
    '[publishPostResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(publishPostResult, publishPostResultStatus, {
    fileName: 'dashboard/httpagg-publishPostResult.json',
    aggregateLevel: 'onError',
  });
}

function splitContentIntoParts(content: string, times: number): string[] {
  const contentLength = content.length;
  const partLength = Math.ceil(contentLength / times);
  const parts = [];

  for (let i = 0; i < times; i++) {
    const start = i * partLength;
    const end = Math.min(start + partLength, contentLength);

    parts.push(content.substring(0, end));
  }

  return parts;
}
