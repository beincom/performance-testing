import 'core-js/stable';
import { Options } from 'k6/options';

import 'regenerator-runtime/runtime';
import { SERVER_DOWN_COUNT, kv } from './utils/http.utils';

export * from './scenarios/newsfeed.scenarios';

export const options: Options = {
  scenarios: {
    newsfeed: {
      exec: 'newsfeedScenario',
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 3 },
        { duration: '15s', target: 6 },
        { duration: '5s', target: 0 },
      ],
    },
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
