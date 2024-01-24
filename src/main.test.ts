import 'core-js/stable';
import { Options } from 'k6/options';

import 'regenerator-runtime/runtime';
import { REQUEST_TIMEOUT_COUNT, SERVER_DOWN_COUNT, kv } from './utils/http.utils';

export * from './scenarios/newsfeed.scenarios';

export const options: Options = {
  scenarios: {
    newsfeed: {
      exec: 'newsfeedScenario',
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
    // newsfeed: {
    //   exec: 'newsfeedScenario',
    //   executor: 'ramping-vus',
    //   startVUs: 1,
    //   stages: [
    //     { duration: '2m', target: 10 },
    //     { duration: '3m', target: 50 },
    //     { duration: '5m', target: 100 },
    //     { duration: '2m', target: 100 },
    //     { duration: '3m', target: 80 },
    //   ],
    // },
    // newsfeed: {
    //   exec: 'newsfeedScenario',
    //   executor: 'per-vu-iterations',
    //   vus: 1,
    //   iterations: 1,
    // },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    [SERVER_DOWN_COUNT]: [{ threshold: 'count < 50' }], // server down should be less than 100
    [REQUEST_TIMEOUT_COUNT]: [{ threshold: 'count < 50' }], // server down should be less than 100
  },
};

export async function setup(): Promise<void> {
  await kv.clear();
}
