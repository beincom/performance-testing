import { createData } from './create-data/create-data';

(async () => {
  await createData({
    communityIndex: 240,
  }).catch(console.error);
})();
