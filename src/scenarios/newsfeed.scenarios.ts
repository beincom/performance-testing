/* eslint-disable @typescript-eslint/ban-ts-comment */
import { check, group, sleep } from 'k6'; // @ts-ignore
import httpagg from 'k6/x/httpagg';

import { Actor } from '../entities/actor';
import { generateRandomNumber, generateRandomString } from '../utils/utils';

export async function newsfeedScenario(): Promise<void> {
  const vuID = __VU; // Get current virtual user's id

  await group('NewsfeedSession', async () => {
    const actor = Actor.init(vuID);

    const randomGetNewsfeedTimes = generateRandomNumber(1, 10);

    let hasNextPage = true;
    let endCursor;

    let reactContentTimes = 0;
    let markAsReadTimes = 0;
    let readContentTimes = 0;

    let totalLoadedContent = 0;

    for (let i = 0; i < randomGetNewsfeedTimes; i++) {
      if (hasNextPage) {
        const newsfeedResult = await actor.getNewsfeed(endCursor);
        const status = check(newsfeedResult, {
          '[newsfeedResult] code was api.ok': (res) => res?.code == 'api.ok',
        });
        httpagg.checkRequest(newsfeedResult, status, {
          fileName: 'dashboard/httpagg-newsfeedResult.json',
          aggregateLevel: 'onError',
        });

        if (newsfeedResult) {
          hasNextPage = newsfeedResult.data.meta.has_next_page;
          endCursor = newsfeedResult.data.meta.end_cursor;

          const contents = newsfeedResult.data.list;
          totalLoadedContent += contents.length;

          // Randomly decide whether to action to content or just scroll newsfeed
          const needActionToContent = generateRandomNumber(0, 1);

          if (needActionToContent) {
            for (let j = 0; j < contents.length; j++) {
              const content = contents[j];
              const ownerReactionNames = (content.owner_reactions || []).map(
                (reaction) => reaction.reaction_name
              );

              // Select each 8 contents per 100 contents to react
              if (content.type !== 'SERIES' && reactContentTimes / totalLoadedContent < 0.08) {
                const hasReaction = await demoReaction(
                  actor,
                  content.id,
                  content.type,
                  ownerReactionNames
                );
                if (hasReaction) {
                  reactContentTimes++;
                }
              }

              if (content.setting.is_important) {
                // User scrolls through an important content ➝ Wait for 3 seconds (assuming the user's reading time).
                sleep(3);

                // Press mark as read  random 5 contents (post, article) per 100 contents
                if (markAsReadTimes / totalLoadedContent < 0.05) {
                  const hasMarkAsRead = await demoMarkAsRead(actor, content.id);
                  if (hasMarkAsRead) {
                    markAsReadTimes++;
                  }
                }
              }

              // For every 50 content, save one
              if ((i * 20 + j) % 50 == 0) {
                await demoSaveContent(actor, content.id);
              }

              // Click on details random 5 contents per 100 contents to read.
              if (readContentTimes / totalLoadedContent < 0.05) {
                const hasReadContent = await demoReadContent(actor, content.id, content.type);
                if (hasReadContent) {
                  readContentTimes++;
                }
              }
            }
          } else {
            // Simulate scrolling scroll newsfeed 2 ➝ 30s
            sleep(generateRandomNumber(2, 30));
          }
        } else {
          hasNextPage = false;
        }
      }
    }
  });
}

export function teardown(data) {
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
}

async function demoReaction(
  actor: Actor,
  targetId: string,
  targetType: string,
  ownerReactionNames: string[]
): Promise<boolean> {
  // Randomly decide whether to react or not
  const needReaction = generateRandomNumber(0, 5);
  if (needReaction !== 1) {
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

  // Simulate user can randomly react from 1 ➝ 7 reactions per content
  const randomReactionTimes = generateRandomNumber(1, candidateReactionNames.length);

  for (let i = 0; i < randomReactionTimes; i++) {
    const reactionName = candidateReactionNames[i];
    const reactionResult = await actor.reaction(targetId, targetType, reactionName);
    const status = check(reactionResult, {
      [`[reactionResult - ${targetType}] code was api.ok`]: (res) => res?.code == 'api.ok',
    });
    httpagg.checkRequest(reactionResult, status, {
      fileName: 'dashboard/httpagg-reactionResult.json',
      aggregateLevel: 'onError',
    });
  }

  return true;
}

async function demoMarkAsRead(actor: Actor, contentId: string): Promise<any> {
  // Randomly decide whether to mark as read or not
  const needMarkAsRead = generateRandomNumber(0, 5);
  if (needMarkAsRead !== 1) {
    return false;
  }

  const markAsReadResult = await actor.markAsRead(contentId);
  const status = check(markAsReadResult, {
    '[markAsReadResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(markAsReadResult, status, {
    fileName: 'dashboard/httpagg-markAsReadResult.json',
    aggregateLevel: 'onError',
  });

  return true;
}

async function demoSaveContent(actor: Actor, contentId: string): Promise<any> {
  const saveContentResult = await actor.saveContent(contentId);
  const status = check(saveContentResult, {
    '[markAsReadResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(saveContentResult, status, {
    fileName: 'dashboard/httpagg-saveContentResult.json',
    aggregateLevel: 'onError',
  });
}

async function demoReadContent(actor: Actor, contentId: string, contentType: string): Promise<any> {
  // Randomly decide whether to read or not
  const needRead = generateRandomNumber(0, 5);
  if (needRead !== 1) {
    return false;
  }

  const contentDetailResult = await actor.getContentDetail(contentId, contentType);
  const status = check(contentDetailResult, {
    '[contentDetailResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(contentDetailResult, status, {
    fileName: 'dashboard/httpagg-contentDetailResult.json',
    aggregateLevel: 'onError',
  });

  // Reading time is between 15 seconds to 3 minutes
  sleep(generateRandomNumber(15, 180));

  // Scroll down to the comments section to read all 20 latest comments
  await demoGetCommentList(actor, contentId);

  // Leave a level 1 comment with random characters (1 to 2000 characters)
  await demoComment(actor, contentId);

  return true;
}

async function demoGetCommentList(actor: Actor, contentId: string): Promise<any> {
  const randomGetCommentsTimes = generateRandomNumber(1, 5);

  let hasNextPage = true;
  let endCursor;

  let reactCommentTimes = 0;
  let hasReplyComment = false;

  for (let i = 0; i < randomGetCommentsTimes; i++) {
    // Click View previous comments...  to see all previous comments
    if (hasNextPage) {
      const commentListResult = await actor.getComments(contentId, endCursor);
      const status = check(commentListResult, {
        '[commentListResult] code was api.ok': (res) => res?.code == 'api.ok',
      });
      httpagg.checkRequest(commentListResult, status, {
        fileName: 'dashboard/httpagg-commentListResult.json',
        aggregateLevel: 'onError',
      });

      if (commentListResult) {
        hasNextPage = commentListResult.data.meta.has_next_page;
        endCursor = commentListResult.data.meta.end_cursor;

        const comments = commentListResult.data.list;

        // Randomly decide whether to action to comment or just scroll comment list
        const needActionToComment = generateRandomNumber(0, 1);
        if (needActionToComment) {
          for (let j = 0; j < comments.length; j++) {
            const comment = comments[j];

            // React to 10 other people's comments
            if (reactCommentTimes < 10) {
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
                reactCommentTimes++;
              }
            }

            if (!hasReplyComment) {
              hasReplyComment = await demoReplyComment(actor, contentId, comment.id);
            }
          }
        } else {
          // Simulate scrolling through the comment list for 2s ➝ 20s
          sleep(generateRandomNumber(2, 20));
        }
      } else {
        hasNextPage = false;
      }
    }
  }
}

async function demoReplyComment(
  actor: Actor,
  contentId: string,
  commentId: string
): Promise<boolean> {
  // Randomly decide whether to reply or not
  const needReply = generateRandomNumber(0, 5);
  if (needReply !== 1) {
    return false;
  }

  const replyContent = 'This is a reply comment';
  const replyCommentResult = await actor.replyComment(contentId, commentId, replyContent);
  const status = check(replyCommentResult, {
    '[replyCommentResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(replyCommentResult, status, {
    fileName: 'dashboard/httpagg-replyCommentResult.json',
    aggregateLevel: 'onError',
  });

  return true;
}

async function demoComment(actor: Actor, contentId: string): Promise<any> {
  const randomContent = generateRandomString(generateRandomNumber(10, 2000));
  const commentResult = await actor.comment(contentId, randomContent);
  const status = check(commentResult, {
    '[commentResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
  httpagg.checkRequest(commentResult, status, {
    fileName: 'dashboard/httpagg-commentResult.json',
    aggregateLevel: 'onError',
  });
}
