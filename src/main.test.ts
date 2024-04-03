/* eslint-disable @typescript-eslint/ban-ts-comment */
import 'core-js/stable';
import { Options } from 'k6/options'; // @ts-ignore
import httpagg from 'k6/x/httpagg';

import 'regenerator-runtime/runtime';
import { NON_AUDIENCES_COUNT, NON_QUIZZES_COUNT } from './main.test';
import { REQUEST_TIMEOUT_COUNT, SERVER_DOWN_COUNT, kv } from './utils/http.utils';

export * from './scenarios/newsfeed.scenarios';
export * from './scenarios/filter-newsfeed.scenarios';
export * from './scenarios/publish-content.scenarios';
export * from './scenarios/join-leave-group.scenarios';
export * from './scenarios/answer-quiz.scenarios';

export const options: Options = {
  scenarios: {
    // newsfeed: {
    //   exec: 'newsfeedScenario',
    //   executor: 'ramping-vus',
    //   startVUs: 1,
    //   stages: [
    //     { duration: '5m', target: 100 },
    //     { duration: '5m', target: 500 },
    //     { duration: '10m', target: 1000 },
    //     { duration: '5m', target: 1000 },
    //     { duration: '15m', target: 800 },
    //   ],
    // },

    filterNewsfeed: {
      exec: 'filterNewsfeedScenario',
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '15m', target: 800 },
      ],
    },

    publishContentScenario: {
      exec: 'publishContentScenario',
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5m', target: 10 },
        { duration: '5m', target: 50 },
        { duration: '10m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '15m', target: 80 },
      ],
    },

    joinLeaveGroupScenario: {
      exec: 'joinLeaveGroupScenario',
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5m', target: 10 },
        { duration: '5m', target: 50 },
        { duration: '10m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '15m', target: 80 },
      ],
    },

    // answerQuiz: {
    //   exec: 'answerQuizScenario',
    //   executor: 'ramping-vus',
    //   startVUs: 1,
    //   stages: [
    //     { duration: '5m', target: 100 },
    //     { duration: '5m', target: 500 },
    //     { duration: '10m', target: 1000 },
    //     { duration: '5m', target: 1000 },
    //     { duration: '15m', target: 800 },
    //   ],
    // },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    [SERVER_DOWN_COUNT]: [{ threshold: 'count < 50' }], // server down should be less than 100
    [REQUEST_TIMEOUT_COUNT]: [{ threshold: 'count < 50' }], // server down should be less than 100
    [NON_AUDIENCES_COUNT]: [{ threshold: 'count < 50' }], // quiz in timeline should be less than 100
    [NON_QUIZZES_COUNT]: [{ threshold: 'count < 50' }], // quiz in timeline should be less than 100
  },
};

export async function setup(): Promise<void> {
  await kv.clear();
}

export function teardown(): void {
  httpagg.generateRaport(
    'dashboard/httpagg-getTokenResult.json',
    'dashboard/httpagg-getTokenResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-newsfeedResult.json',
    'dashboard/httpagg-newsfeedResult-report.html'
  );
  httpagg.generateRaport(
    'dashboard/httpagg-reactionResult.json',
    'dashboard/httpagg-reactionResult-report.html'
  );
  httpagg.generateRaport(
    'dashboard/httpagg-markAsReadResult.json',
    'dashboard/httpagg-markAsReadResult-report.html'
  );
  httpagg.generateRaport(
    'dashboard/httpagg-saveContentResult.json',
    'dashboard/httpagg-saveContentResult-report.html'
  );
  httpagg.generateRaport(
    'dashboard/httpagg-contentDetailResult.json',
    'dashboard/httpagg-contentDetailResult-report.html'
  );
  httpagg.generateRaport(
    'dashboard/httpagg-commentListResult.json',
    'dashboard/httpagg-commentListResult-report.html'
  );
  httpagg.generateRaport(
    'dashboard/httpagg-replyCommentResult.json',
    'dashboard/httpagg-replyCommentResult-report.html'
  );
  httpagg.generateRaport(
    'dashboard/httpagg-commentResult.json',
    'dashboard/httpagg-commentResult-report.html'
  );
  httpagg.generateRaport(
    'dashboard/httpagg-menuSettingsResult.json',
    'dashboard/httpagg-menuSettingsResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-audienceGroupsResult.json',
    'dashboard/httpagg-audienceGroupsResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-createDraftPostResult.json',
    'dashboard/httpagg-createDraftPostResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-saveDraftPostResult.json',
    'dashboard/httpagg-saveDraftPostResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-publishPostResult.json',
    'dashboard/httpagg-publishPostResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-joinGroupResult.json',
    'dashboard/httpagg-joinGroupResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-leaveGroupResult.json',
    'dashboard/httpagg-leaveGroupResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-discoverGroupsResult.json',
    'dashboard/httpagg-discoverGroupsResult-report.html'
  );

  httpagg.generateRaport(
    'dashboard/httpagg-groupDetailResult.json',
    'dashboard/httpagg-groupDetailResult-report.html'
  );

  // httpagg.generateRaport(
  //   'dashboard/httpagg-timelineResult.json',
  //   'dashboard/httpagg-timelineResult-report.html'
  // );
  // httpagg.generateRaport(
  //   'dashboard/httpagg-startQuizResult.json',
  //   'dashboard/httpagg-startQuizResult-report.html'
  // );
  // httpagg.generateRaport(
  //   'dashboard/httpagg-getQuizResult.json',
  //   'dashboard/httpagg-getQuizResult-report.html'
  // );
  // httpagg.generateRaport(
  //   'dashboard/httpagg-answerQuizResult.json',
  //   'dashboard/httpagg-answerQuizResult-report.html'
  // );
  // httpagg.generateRaport(
  //   'dashboard/httpagg-finishQuizResult.json',
  //   'dashboard/httpagg-finishQuizResult-report.html'
  // );
}
