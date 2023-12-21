import { CONFIGS } from '../config';

export const COMMON_CONFIG = {
  TIMEOUT: 200000,
  LATEST_VER: '1.1.0',
  HEADER_KEY: {
    REQ_ID: 'x-request-id',
    VER: 'x-version-id',
  },
};
const TEST_ENV = 'develop';

const SERVICE_ENV = {
  DEVELOP: {
    GROUP: {
      HOST: 'https://api.beincom.io/v1/group',
      LATEST_VER: '1.1.0',
    },
    USER: {
      HOST: 'https://api.beincom.io/v1/user',
      LATEST_VER: '1.0.0',
    },
    NOTI: {
      HOST: 'https://api.beincom.io/v1/notification',
      LATEST_VER: '1.1.0',
    },
    CONTENT: {
      HOST: 'https://api.beincom.io/v1/content',
      LATEST_VER: '1.12.0',
    },
  },
  STAGING: {
    GROUP: {
      HOST: 'https://api.beincom.io/v1/group',
      LATEST_VER: '1.1.0',
    },
    USER: {
      HOST: 'https://api.beincom.io/v1/user',
      LATEST_VER: '1.1.0',
    },
    NOTI: {
      HOST: 'https://api.beincom.io/v3/notification',
      LATEST_VER: '1.1.0',
    },
    CONTENT: {
      HOST: 'https://api.beincom.io/v1/content',
      LATEST_VER: '1.12.0',
    },
  },
};

export const SERVICE = TEST_ENV === 'develop' ? SERVICE_ENV.DEVELOP : SERVICE_ENV.STAGING;

export const TEST_PASSWORD = CONFIGS.DEFAULT_PASSWORD;
