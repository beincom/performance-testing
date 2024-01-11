import { check, group, sleep } from 'k6';

import { Actor } from '../entities/actor';
import { generateRandomNumber, generateRandomString } from '../utils/utils';

export async function newsfeedScenario(): Promise<void> {
  await group('NewsfeedSession', async () => {
    const actor = Actor.init();

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
        check(newsfeedResult, {
          'response get timeline code was api.ok': (res) => res?.code == 'api.ok',
        });

        if (newsfeedResult) {
          hasNextPage = newsfeedResult.meta.has_next_page;
          endCursor = newsfeedResult.meta.end_cursor;

          const contents = newsfeedResult.data.list;
          totalLoadedContent += contents.length;

          for (let j = 0; j < contents.length; j++) {
            const content = contents[j];
            const ownerReactionNames = (content.owner_reactions || []).map(
              (reaction) => reaction.reaction_name
            );

            // Select each 8 contents per 100 contents to react
            if (reactContentTimes < 8 * (Math.floor(totalLoadedContent / 100) + 1)) {
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
              if (markAsReadTimes < 5 * (Math.floor(totalLoadedContent / 100) + 1)) {
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
            if (readContentTimes < 5 * (Math.floor(totalLoadedContent / 100) + 1)) {
              const hasReadContent = await demoReadContent(actor, content.id, content.type);
              if (hasReadContent) {
                readContentTimes++;
              }
            }
          }
        } else {
          hasNextPage = false;
        }

        // Simulate scrolling scroll newsfeed 2 ➝ 30s
        sleep(generateRandomNumber(2, 30));
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

  // Simulate user can randomly react from 1 ➝ 7 reactions per content
  const randomReactionTimes = generateRandomNumber(1, candidateReactionNames.length);

  for (let i = 0; i < randomReactionTimes; i++) {
    const reactionName = candidateReactionNames[i];
    const reactionResult = await actor.reaction(targetId, targetType, reactionName);
    check(reactionResult, {
      [`[reactionResult - ${targetType}] code was api.ok`]: (res) => res?.code == 'api.ok',
    });

    // Demo user can react 1 time per second
    sleep(1);
  }

  return true;
}

async function demoMarkAsRead(actor: Actor, contentId: string): Promise<any> {
  // Randomly decide whether to mark as read or not
  const needMarkAsRead = generateRandomNumber(0, 1);
  if (!needMarkAsRead) {
    return false;
  }

  const markAsReadResult = await actor.markAsRead(contentId);
  check(markAsReadResult, {
    '[markAsReadResult] code was api.ok': (res) => res?.code == 'api.ok',
  });

  return true;
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
      check(commentListResult, {
        '[commentListResult] code was api.ok': (res) => res?.code == 'api.ok',
      });

      if (commentListResult) {
        hasNextPage = commentListResult.meta.has_next_page;
        endCursor = commentListResult.meta.end_cursor;

        const comments = commentListResult.data.list;

        for (let i = 0; i < comments.length; i++) {
          const comment = comments[i];

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
        hasNextPage = false;
      }
    }

    // Simulate scrolling through the comment list for 2s ➝ 30s
    sleep(generateRandomNumber(2, 30));
  }
}

async function demoReplyComment(
  actor: Actor,
  contentId: string,
  commentId: string
): Promise<boolean> {
  // Randomly decide whether to reply or not
  const needReply = generateRandomNumber(0, 1);
  if (!needReply) {
    return false;
  }

  const replyContent = 'This is a reply comment';
  const replyCommentResult = await actor.replyComment(contentId, commentId, replyContent);
  check(replyCommentResult, {
    '[replyCommentResult] code was api.ok': (res) => res?.code == 'api.ok',
  });

  return true;
}

async function demoComment(actor: Actor, contentId: string): Promise<any> {
  const randomContent = generateRandomString(generateRandomNumber(1, 2000));
  const commentResult = await actor.comment(contentId, randomContent);
  check(commentResult, {
    '[commentResult] code was api.ok': (res) => res?.code == 'api.ok',
  });
}
