// import { createData } from './create-data/create-data';
// import { convertQuizDumpToArray } from './create-quiz/convert-dump-to-array';
// import { createQuizCsv } from './create-quiz/create-quiz';
// import { setupCommunityMembers } from './create-data/join-community';
import { setupContents } from './create-data/publish-content';

(async () => {
  // await createData({
  //   communityIndex: 100,
  // }).catch(console.error);
  // await convertQuizDumpToArray().catch(console.error);
  // await createQuizCsv().catch(console.error);
  await setupContents().catch(console.error);
})();
