import 'core-js/stable';
import { Options } from 'k6/options';

import 'regenerator-runtime/runtime';
import { SERVER_DOWN_COUNT, kv } from './utils/http.utils';

// export * from './scenarios/newsfeed.scenarios';
export * from './scenarios/timeline.scenarios';

export const options: Options = {
  scenarios: {
    // newsfeed: {
    //   exec: 'newsfeedScenario',
    //   executor: 'ramping-vus',
    //   startVUs: 1,
    //   stages: [
    //     { duration: '5s', target: 100 },
    //     { duration: '10s', target: 500 },
    //     { duration: '1m', target: 1000 },
    //     { duration: '2m', target: 2000 },
    //     { duration: '30s', target: 500 },
    //     { duration: '10s', target: 0 },
    //   ],
    // },
    // newsfeed: {
    //   exec: 'newsfeedScenario',
    //   executor: 'per-vu-iterations',
    //   vus: 100,
    //   iterations: 10,
    // },
    // newsfeed: {
    //   exec: 'newsfeedScenario',
    //   executor: 'constant-vus',
    //   vus: 1,
    //   duration: '30s',
    // },
    // timeline: {
    //   exec: 'timelineScenario',
    //   executor: 'shared-iterations',
    //   vus: 10,
    //   iterations: 20,
    // },
    // timeline: {
    //   exec: 'timelineScenario',
    //   executor: 'per-vu-iterations',
    //   vus: 10,
    //   iterations: 20,
    //   maxDuration: '30s',
    // },
    // timeline: {
    //   exec: 'timelineScenario',
    //   executor: 'ramping-vus',
    //   gracefulRampDown: '1s',
    //   startVUs: 1,
    //   stages: [
    //     { duration: '5s', target: 10 },
    //     { duration: '1ms', target: 50 },
    //     { duration: '30s', target: 0 },
    //   ],
    // },
    timeline: {
      exec: 'timelineScenario',
      executor: 'constant-arrival-rate',
      duration: '10m',
      rate: 10,
      preAllocatedVUs: 100,
    },
    // timeline: {
    //   exec: 'timelineScenario',
    //   executor: 'externally-controlled',
    //   duration: '1m',
    //   vus: 10,
    //   maxVUs: 20,
    // },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    [SERVER_DOWN_COUNT]: [{ threshold: 'count < 1', abortOnFail: true }],
  },
};

export async function setup(): Promise<void> {
  await kv.clear();
}
