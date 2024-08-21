/* eslint-disable @typescript-eslint/ban-ts-comment */
import { check, group, sleep } from 'k6';
import execution from 'k6/execution';
import { Counter, Rate } from 'k6/metrics'; // @ts-ignore
import httpagg from 'k6/x/httpagg';

import sampleContents from '../../seed/sample-contents.json';
import { Actor } from '../entities/actor';
import { generateActorID, generateRandomNumber } from '../utils/utils';

export const NON_AUDIENCES_COUNT = 'non_audiences_count';
export const GENERATE_QUIZ_RATE = 'generate_quiz_rate';

const NonAudiencesCounter = new Counter(NON_AUDIENCES_COUNT);
const GenerateQuizRate = new Rate(GENERATE_QUIZ_RATE);

export async function publishContentScenario(): Promise<void> {
  const { idInInstance, idInTest, iterationInInstance, iterationInScenario } = execution.vu;

  const uniqueActorId = generateActorID({
    idInInstance,
    idInTest,
    iterationInInstance,
    iterationInScenario,
  });

  await group('PublishContentSession', async () => {
    const actor = Actor.init(uniqueActorId);

    const randomPublishContentTimes = generateRandomNumber(1, 5);

    for (let i = 0; i < randomPublishContentTimes; i++) {
      const content = sampleContents[generateRandomNumber(0, sampleContents.length - 1)];

      const { postId, groupIds } = await createDraftPost(actor);
      const seriesIds = await getSeriesIds(actor, groupIds);
      await demoSaveDraftPost(actor, { postId, groupIds, content: content.content });
      await publishPost(actor, { postId, groupIds, content: content.content, seriesIds });

      // Randomly decide whether to generate quiz
      const needGenerateQuiz = generateRandomNumber(0, 9);
      let quizGenerated = false;
      if (needGenerateQuiz === 1) {
        quizGenerated = await generateQuiz(actor, postId);
      }

      GenerateQuizRate.add(quizGenerated); // Record the metric

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
    NonAudiencesCounter.add(1);
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
  data: { postId: string; groupIds: string[]; content: string; seriesIds: string[] }
): Promise<void> {
  const { postId, groupIds, content, seriesIds } = data;

  // Simulate user reviewing the post
  sleep(generateRandomNumber(10, 60));

  const publishPostResult = await actor.publishPost(postId, { groupIds, content, seriesIds });
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

async function getSeriesIds(actor: Actor, groupIds: string[]): Promise<string[]> {
  const randomSeriesCount = generateRandomNumber(0, 2);

  if (!randomSeriesCount) {
    return [];
  }

  const seriesResult = await actor.getSeries(groupIds);

  const seriesResultStatus = check(seriesResult, {
    '[seriesResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(seriesResult, seriesResultStatus, {
    fileName: 'dashboard/httpagg-seriesResult.json',
    aggregateLevel: 'onError',
  });

  const seriesIds = (seriesResult?.data?.list || []).map((series) => series.id);

  if (seriesIds.length <= randomSeriesCount) {
    return seriesIds;
  }

  // Randomly pick series
  const pickedSeriesIds = [];
  for (let i = 0; i < randomSeriesCount; i++) {
    pickedSeriesIds.push(seriesIds[generateRandomNumber(0, seriesIds.length - 1)]);
  }

  return pickedSeriesIds;
}

async function generateQuiz(actor: Actor, contentId: string): Promise<boolean> {
  const menuSettingsResult = await actor.getMenuSettings(contentId);
  const menuSettingsStatus = check(menuSettingsResult, {
    '[menuSettingsResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(menuSettingsResult, menuSettingsStatus, {
    fileName: 'dashboard/httpagg-menuSettingsResult.json',
    aggregateLevel: 'onError',
  });

  let quizGenerated = false; // Add this line to track if the quiz was generated

  if (menuSettingsResult?.data) {
    if (menuSettingsResult.data.canCreateQuiz) {
      const generateQuizResult = await actor.generateQuiz(contentId);
      const status = check(generateQuizResult, {
        '[generateQuizResult] code was api.ok': (res) => res?.code == 'api.ok',
      });
      httpagg.checkRequest(generateQuizResult, status, {
        fileName: 'dashboard/httpagg-generateQuizResult.json',
        aggregateLevel: 'onError',
      });

      quizGenerated = true; // Set to true if quiz was generated
    }
  }

  return quizGenerated;
}
