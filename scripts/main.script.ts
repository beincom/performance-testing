import { createData } from './create-data/create-data';

(async () => {
  await createData({
    communityIndex: 100,
  }).catch(console.error);
})();
