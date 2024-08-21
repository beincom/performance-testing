import { User, randomSleep } from '../http/http-service';
import { generateArticleSeed, generatePostSeed } from '../seed/content-seed-generator';
import { generateUserNameSeed } from '../seed/user-seed-generator';
import { makeArrayFromRange } from '../utils/utils';

import communities from './communities.json';
import { ISeedCommunity } from './join-community';

export async function setupContents(): Promise<void> {
  console.log({ step: 'START' });

  for (const community of communities) {
    await createContents(community as unknown as ISeedCommunity);
  }

  return console.log({ step: 'FINISHED' });
}

async function createContents(community: ISeedCommunity): Promise<void> {
  const communityOwner = await User.init({ username: community.username });

  const seedPosts = Array.from({ length: community.numOfPosts }, (_, index) =>
    generatePostSeed(`${community.name} - Post ${index + 1}`)
  );
  const seedArticles = Array.from({ length: community.numOfArticles }, (_, index) =>
    generateArticleSeed(`${community.name} - Article ${index + 1}`)
  );
  const seedSeries = Array.from(
    { length: community.numOfSeries },
    (_, index) => `${community.name} - Series ${index + 1}`
  );

  const memberUsernames = makeArrayFromRange(
    community.memberRange[0],
    community.memberRange[1]
  ).map(generateUserNameSeed);

  for (const memberUsernameIndex of Object.keys(memberUsernames)) {
    await randomSleep();

    const memberUsername = memberUsernames[memberUsernameIndex];
    const member = await User.init({ username: memberUsername });

    // each member pick 10 post to publish until all post are published
    const postsToPublish = seedPosts.slice(
      +memberUsernameIndex * 20,
      (+memberUsernameIndex + 1) * 20
    );
    const articlesToPublish = seedArticles.slice(
      +memberUsernameIndex * 10,
      (+memberUsernameIndex + 1) * 10
    );
    const seriesToPublish = seedSeries.slice(
      +memberUsernameIndex * 10,
      (+memberUsernameIndex + 1) * 10
    );

    if (!postsToPublish.length && !articlesToPublish.length && !seriesToPublish.length) {
      break;
    }

    await createPosts(communityOwner, member, community, postsToPublish);
    await createArticles(communityOwner, member, community, articlesToPublish);
    await createSeries(communityOwner, community, seriesToPublish);

    member.cleanUp();
  }

  communityOwner.cleanUp();
}

async function createPosts(
  communityOwner: User,
  member: User,
  community: ISeedCommunity,
  postsToPublish: string[]
): Promise<void> {
  if (!postsToPublish.length) {
    return;
  }

  await Promise.all(
    postsToPublish.map(async (content) => {
      await randomSleep();
      const { id } = await member.createDraftPost([community.groupId]);
      await member.publishPost(id, content);

      // random 10% set important posts
      const isImportant = Math.random() < 0.1;
      if (isImportant) {
        await communityOwner.updateContentImportant(id, true);
      }
    })
  );
  console.log(`createPosts - FINISHED - ${community.name} - ${member.username}`);
}

async function createArticles(
  communityOwner: User,
  member: User,
  community: ISeedCommunity,
  articlesToPublish: { title: string; content: string }[]
): Promise<void> {
  if (!articlesToPublish.length) {
    return;
  }

  await Promise.all(
    articlesToPublish.map(async ({ title, content }) => {
      await randomSleep();
      const { id } = await member.createDraftArticle([community.groupId]);
      await member.publishArticle(id, {
        title,
        content,
        categories: ['fea16424-4674-49ea-8948-e1b878611b0c'],
      });

      // random 10% set important articles
      const isImportant = Math.random() < 0.1;
      if (isImportant) {
        await communityOwner.updateContentImportant(id, true);
      }
    })
  );
  console.log(`createArticles - FINISHED - ${community.name} - ${member.username}`);
}

async function createSeries(
  communityOwner: User,
  community: ISeedCommunity,
  seriesToPublish: string[]
): Promise<void> {
  if (!seriesToPublish.length) {
    return;
  }

  await Promise.all(
    seriesToPublish.map(async (seriesTitle) => {
      await randomSleep();

      // random 10% set important series
      const isImportant = Math.random() < 0.1;
      await communityOwner.publishSeries(
        seriesTitle,
        community.imageId,
        [community.groupId],
        isImportant
      );
    })
  );
  console.log(`createSeries - FINISHED - ${community.name} - ${communityOwner.username}`);
}
