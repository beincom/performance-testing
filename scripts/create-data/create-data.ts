import { ROLE_TYPE } from '@beincom/constants';
import _ from 'lodash';

import { CONFIGS } from '../../config';
import { Community, SysAdmin, User, randomSleep } from '../http/http-service';
import { generatePostSeed } from '../seed/content-seed-generator';
import { SeedCommunity, generateCommunitySeed } from '../seed/group-seed-generator';

export interface ISeedDataFrom {
  communityIndex: number;
}

export async function createData(from: ISeedDataFrom): Promise<void> {
  console.log({ step: 'START' });

  const { communityIndex: fromCommunityIndex } = from;

  const sysAdmin = await SysAdmin.init();

  for (
    let communityIndex = fromCommunityIndex;
    communityIndex < fromCommunityIndex + CONFIGS.NUMBER_OF_COMMUNITIES;
    communityIndex++
  ) {
    const seedCommunity = generateCommunitySeed(communityIndex);

    const owner = await User.init({
      username: seedCommunity.owner.username,
    });

    const community = await sysAdmin.findCommunityByName(seedCommunity.name);

    await cancelAllInvitations(community, owner);
    await setupCommunityMembers(seedCommunity, community, owner, sysAdmin);
    await createContents(community, owner);

    owner.cleanUp();
  }

  sysAdmin.cleanUp();

  return console.log({ step: 'FINISHED' });
}

async function cancelAllInvitations(community: Community, owner: User): Promise<void> {
  const limit = 500;
  let offset = 0;
  while (true) {
    const invitations = await owner.getInvitations(community.id, {
      offset,
      limit,
    });

    if (!invitations.length) {
      break;
    }
    console.log({
      community: community.name,
      step: 'cancelAllInvitations',
      invitationCount: invitations.length,
    });
    offset += limit;

    await Promise.all(
      invitations.map(async (i) => (await randomSleep()) && (await owner.cancelInvitation(i.id)))
    );
  }
}

async function setupCommunityMembers(
  seedCommunity: SeedCommunity,
  community: Community,
  owner: User,
  sysAdmin: SysAdmin
): Promise<void> {
  let missingMemberUsernames = seedCommunity.members.map((u) => u.username);
  let missingAdminUsernames = seedCommunity.admins.map((u) => u.username);

  await owner.approveAllJoinRequests(community.group_id);
  const body = {
    groupIds: [community.group_id],
    includeArchived: true,
    includeDeactivated: true,
    limit: 500,
    after: null,
  };
  while (true) {
    const res = await owner.getInternalGroupMembers(body);

    const memberIds = res.data;
    const currentMembers = await sysAdmin.getInternalUsersByIds(memberIds);
    const redundantMembers = _.differenceBy(
      currentMembers,
      seedCommunity.members.concat(seedCommunity.owner),
      'username'
    );
    const currentAdminIds =
      (await sysAdmin.findUsersInGroupsByRoles([community.group_id], [ROLE_TYPE.COMMUNITY_ADMIN]))[
        'community_admin'
      ]?.[community.group_id] ?? [];
    const currentAdmins = await sysAdmin.getInternalUsersByIds(currentAdminIds);
    const redundantAdmins = _.differenceBy(
      currentAdmins,
      seedCommunity.admins.concat(seedCommunity.owner).concat(redundantMembers as any),
      'username'
    );

    missingMemberUsernames = missingMemberUsernames.filter(
      (username) => !currentMembers.some((cm) => cm.username === username)
    );
    missingAdminUsernames = missingAdminUsernames.filter(
      (username) => !currentAdmins.some((ca) => ca.username === username)
    );
    console.log({
      community: community.name,
      step: 'setupCommunityMembers',
      missingMemberCount: missingMemberUsernames.length,
      missingAdminCount: missingAdminUsernames.length,
    });

    await Promise.all(
      _.chunk(
        redundantMembers.map((u) => u.id),
        500
      ).map(async (redundantMemberIds) => {
        const sleep = await randomSleep();
        await owner.removeGroupMembersAsManager(
          community.id,
          community.group_id,
          redundantMemberIds
        );
        console.log({
          community: community.name,
          step: 'setupCommunityMembers',
          subStep: 'removeRedundantCommunityMembers',
          sleep,
          removedCount: redundantMemberIds.length,
        });
      })
    );

    if (redundantAdmins.length) {
      await owner.revokeCommunityAdmin(
        redundantAdmins.map((u) => u.id),
        community.id
      );
    }

    if (!res.data.length || !res.meta.cursors.next) {
      break;
    }
    body.after = res.meta.cursors.next as any;
  }
  await Promise.all(
    missingMemberUsernames.map(async (username) => {
      const sleep = await randomSleep();
      const user = await User.init({ username });
      await user.joinGroup(community.group_id);
      user.cleanUp();
      console.log({
        community: community.name,
        step: 'setupCommunityMembers',
        subStep: 'joinCommunity',
        sleep,
        user: username,
      });
    })
  );

  const sleep = await randomSleep();
  await owner.approveAllJoinRequests(community.group_id);
  console.log({
    community: community.name,
    step: 'setupCommunityMembers',
    subStep: 'approveAllJoinRequests',
    sleep,
  });

  const comAdminIds = (await sysAdmin.getUsersByUsernames(missingAdminUsernames)).map((u) => u.id);

  comAdminIds.length ? await owner.assignCommunityAdmin(comAdminIds, community.id) : null;
}

async function createContents(community: Community, owner: User): Promise<void> {
  const contents = Array.from({ length: CONFIGS.NUMBER_OF_CONTENTS_IN_COMMUNITY }, (_, i) =>
    generatePostSeed(i + 1)
  );

  await Promise.all(
    _.chunk(contents, 100).map(async (newContents, index) => {
      await Promise.all(
        newContents.map(async (content, subindex) => {
          const sleep = await randomSleep();
          const { id } = await owner.createDraftPost([community.group_id]);
          console.log({
            community: community.name,
            step: 'createContents',
            subStep: 'createDraftPost',
            sleep,
            postId: id,
            index: index * 100 + subindex + 1,
          });
          await owner.publishPost(id, content);
          console.log({
            community: community.name,
            step: 'createContents',
            subStep: 'publishPost',
            sleep,
            postId: id,
            index: index * 100 + subindex + 1,
          });
        })
      );
    })
  );
}
