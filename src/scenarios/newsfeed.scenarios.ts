import { check, group, sleep } from 'k6';

import { Actor } from '../entities/actor';
import { generateRandomNumber, generateRandomString } from '../utils/utils';

export async function newsfeedScenario(): Promise<void> {
  await group('NewsfeedSession', async () => {
    const actor = Actor.init();

    const randomGetNewsfeedTimes = generateRandomNumber(1, 5);

    let hasNextPage = true;
    let endCursor;

    for (let i = 0; i < randomGetNewsfeedTimes; i++) {
      if (hasNextPage) {
        const newsfeedResult = await actor.getNewsfeed(endCursor);

        check(newsfeedResult, {
          'response get timeline code was api.ok': (res) => res?.code == 'api.ok',
        });

        if (newsfeedResult) {
          hasNextPage = newsfeedResult.meta.has_next_page;
          endCursor = newsfeedResult.meta.end_cursor;

          const contents = newsfeedResult.data.list;

          let reactionPostTimes = 0;
          let reactionArticleTimes = 0;
          let readArticleTimes = 0;

          for (let i = 0; i < contents.length; i++) {
            // Simulate scrolling through the post content for 2s ➝ 30s
            sleep(generateRandomNumber(2, 30));

            const content = contents[i];
            const ownerReactionNames = (content.owner_reactions || []).map(
              (reaction) => reaction.reaction_name
            );

            if (content.type == 'POST') {
              // Each 3 posts ➝ react
              if (reactionPostTimes < 3) {
                const hasReaction = await demoReaction(
                  actor,
                  content.id,
                  content.type,
                  ownerReactionNames
                );

                if (hasReaction) {
                  reactionPostTimes++;
                }
              }
            }

            if (content.type == 'ARTICLE') {
              // Each 5 articles ➝ react
              if (reactionArticleTimes < 5) {
                const hasReaction = await demoReaction(
                  actor,
                  content.id,
                  content.type,
                  ownerReactionNames
                );

                if (hasReaction) {
                  reactionArticleTimes++;
                }
              }

              // Click on details to read about 5 articles
              if (readArticleTimes < 5) {
                const hasReadContent = await demoReadContent(actor, content.id, content.type);
                if (hasReadContent) {
                  readArticleTimes++;
                }
              }
            }

            // Press mark as read  if available.
            if (content.setting.is_important) {
              await demoMarkAsRead(actor, content.id);
            }

            // For every 5 content, save one.
            if (i % 5 == 0) {
              await demoSaveContent(actor, content.id);
            }
          }
        } else {
          hasNextPage = false;
        }
      }
    }
  });
}

async function demoReaction(
  actor: Actor,
  targetId: string,
  targetType: string,
  ownerReactionNames: string[]
): Promise<boolean> {
  // Randomly decide whether to react or not
  const needReaction = generateRandomNumber(0, 1);
  if (!needReaction) {
    return false;
  }

  const reactionNames = [
    'bic_thumbs_up',
    'bic_sparkling_heart',
    'bic_hugging_face',
    'bic_smiling_face_with_heart_eyes',
    'bic_party_popper',
    'bic_clapping_hands',
    'bic_fire',
  ];
  const candidateReactionNames = reactionNames.filter((reactionName) => {
    return !ownerReactionNames.includes(reactionName);
  });

  if (candidateReactionNames.length == 0) {
    return false;
  }

  const randomReactionTimes = generateRandomNumber(1, candidateReactionNames.length); // Simulate user can randomly react from 1 ➝ 7 reactions per content

  for (let i = 0; i < randomReactionTimes; i++) {
    const reactionName = candidateReactionNames[i];
    const reactionResult = await actor.reaction(targetId, targetType, reactionName);
    check(reactionResult, {
      [`[reactionResult - ${targetType}] code was api.ok`]: (res) => res?.code == 'api.ok',
    });

    sleep(1);
  }

  return true;
}

async function demoMarkAsRead(actor: Actor, contentId: string): Promise<any> {
  const markAsReadResult = await actor.markAsRead(contentId);
  check(markAsReadResult, {
    '[markAsReadResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
}

async function demoSaveContent(actor: Actor, contentId: string): Promise<any> {
  const saveContentResult = await actor.saveContent(contentId);
  check(saveContentResult, {
    '[markAsReadResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
}

async function demoReadContent(actor: Actor, contentId: string, contentType: string): Promise<any> {
  // Randomly decide whether to read or not
  const needRead = generateRandomNumber(0, 1);
  if (!needRead) {
    return false;
  }

  const contentDetailResult = await actor.getContentDetail(contentId, contentType);
  check(contentDetailResult, {
    '[contentDetailResult] code was api.ok': (res) => res?.code == 'api.ok',
  });

  // Reading time is between 15 seconds to 3 minutes
  sleep(generateRandomNumber(15, 180));

  // React to Other Comments
  await demoComment(actor, contentId);

  return true;
}

async function demoComment(actor: Actor, contentId: string): Promise<any> {
  const randomGetCommentsTimes = generateRandomNumber(1, 5);

  let hasNextPage = true;
  let endCursor;

  for (let i = 0; i < randomGetCommentsTimes; i++) {
    if (hasNextPage) {
      const commentListResult = await actor.getComments(contentId, endCursor);
      check(commentListResult, {
        '[commentListResult] code was api.ok': (res) => res?.code == 'api.ok',
      });

      if (commentListResult) {
        hasNextPage = commentListResult.meta.has_next_page;
        endCursor = commentListResult.meta.end_cursor;

        const comments = commentListResult.data.list;

        let reactionCommentTimes = 0;

        for (let i = 0; i < comments.length; i++) {
          const comment = comments[i];

          // Leave 1 reply on each comment
          await demoReplyComment(actor, contentId, comment.id);

          // React to 10 other people's comments
          if (reactionCommentTimes < 3) {
            const ownerReactionNames = (comment.owner_reactions || []).map(
              (reaction) => reaction.reaction_name
            );
            const hasReaction = await demoReaction(
              actor,
              comment.id,
              'COMMENT',
              ownerReactionNames
            );
            if (hasReaction) {
              reactionCommentTimes++;
            }
          }
        }
      } else {
        hasNextPage = false;
      }
    }

    // Simulate scrolling through the comment list for 2s ➝ 30s
    sleep(generateRandomNumber(2, 30));
  }
}

async function demoReplyComment(actor: Actor, contentId: string, commentId: string): Promise<any> {
  const randomContent = generateRandomString(generateRandomNumber(1, 2000));
  const replyCommentResult = await actor.replyComment(contentId, commentId, randomContent);
  check(replyCommentResult, {
    '[replyCommentResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
}
