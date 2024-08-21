/* eslint-disable @typescript-eslint/ban-ts-comment */
import { check, group } from 'k6';
import execution from 'k6/execution'; // @ts-ignore
import httpagg from 'k6/x/httpagg';

import { Actor } from '../entities/actor';
import { generateActorID, generateRandomNumber } from '../utils/utils';

export async function joinLeaveGroupScenario(): Promise<void> {
  const { idInInstance, idInTest, iterationInInstance, iterationInScenario } = execution.vu;

  const uniqueActorId = generateActorID({
    idInInstance,
    idInTest,
    iterationInInstance,
    iterationInScenario,
  });

  await group('JoinLeaveGroupSession', async () => {
    const actor = Actor.init(uniqueActorId);

    const randomJoinGroupTimes = generateRandomNumber(1, 10);
    let randomLeaveGroupTimes = generateRandomNumber(1, 2);

    const joinGroupIds = await getJoinGroupIds(actor, randomJoinGroupTimes);
    const realJoinGroupIds = [];

    for (const groupId of joinGroupIds) {
      let joinGroupId = groupId;

      while (true) {
        if (!joinGroupId) {
          break;
        }

        const groupDetailResult = await actor.getGroupDetail(joinGroupId);
        const groupDetailResultStatus = check(groupDetailResult, {
          '[groupDetailResult] code was api.ok': (res) => res?.code == 'api.ok',
        });
        httpagg.checkRequest(groupDetailResult, groupDetailResultStatus, {
          fileName: 'dashboard/httpagg-groupDetailResult.json',
          aggregateLevel: 'onError',
        });

        if (groupDetailResult.data?.join_status === 'CAN_JOIN') {
          const joinGroupResult = await actor.joinGroup(joinGroupId);
          const joinGroupResultStatus = check(joinGroupResult, {
            '[joinGroupResult] code was api.ok': (res) => res?.code == 'api.ok',
          });
          httpagg.checkRequest(joinGroupResult, joinGroupResultStatus, {
            fileName: 'dashboard/httpagg-joinGroupResult.json',
            aggregateLevel: 'onError',
          });

          if (joinGroupResultStatus === true) {
            realJoinGroupIds.push(joinGroupId);
          }

          break;
        } else {
          const [moreGroupId] = await getJoinGroupIds(actor, 1);
          joinGroupId = moreGroupId;
        }
      }
    }

    while (randomLeaveGroupTimes) {
      const leaveGroupId = realJoinGroupIds.shift();
      if (!leaveGroupId) {
        break;
      }

      const groupDetailResult = await actor.getGroupDetail(leaveGroupId);
      const groupDetailResultStatus = check(groupDetailResult, {
        '[groupDetailResult] code was api.ok': (res) => res?.code == 'api.ok',
      });
      httpagg.checkRequest(groupDetailResult, groupDetailResultStatus, {
        fileName: 'dashboard/httpagg-groupDetailResult.json',
        aggregateLevel: 'onError',
      });

      if (groupDetailResult.data?.join_status === 'JOINED') {
        const leaveGroupResult = await actor.leaveGroup(leaveGroupId);
        const leaveGroupResultStatus = check(leaveGroupResult, {
          '[leaveGroupResult] code was api.ok': (res) => res?.code == 'api.ok',
        });
        httpagg.checkRequest(leaveGroupResult, leaveGroupResultStatus, {
          fileName: 'dashboard/httpagg-leaveGroupResult.json',
          aggregateLevel: 'onError',
        });

        if (leaveGroupResultStatus === true) {
          randomLeaveGroupTimes--;
        }
      }
    }
  });
}

async function getJoinGroupIds(actor: Actor, numOfGroup: number): Promise<string[]> {
  let hasNextPage = true;
  let offset = 0;

  const joinGroups = [];

  while (hasNextPage) {
    const discoverGroupsResult = await actor.discoverGroups(offset);
    const discoverGroupsResultStatus = check(discoverGroupsResult, {
      '[discoverGroupsResult] code was api.ok': (res) => res?.code == 'api.ok',
    });
    httpagg.checkRequest(discoverGroupsResult, discoverGroupsResultStatus, {
      fileName: 'dashboard/httpagg-discoverGroupsResult.json',
      aggregateLevel: 'onError',
    });

    const groups = discoverGroupsResult?.data || [];
    if (groups.length) {
      hasNextPage = discoverGroupsResult.meta.has_next_page;
      offset = discoverGroupsResult.meta.offset;

      const canJoinGroups = groups.filter(
        (group) =>
          group.join_status === 'CAN_JOIN' &&
          Object.values(group.settings).every((settingValue) => settingValue === false)
      );

      if (canJoinGroups.length) {
        const numOfNeedJoinGroups = Math.min(numOfGroup - joinGroups.length, canJoinGroups.length);
        if (numOfNeedJoinGroups) {
          joinGroups.push(...canJoinGroups.slice(0, numOfNeedJoinGroups));
        } else {
          hasNextPage = false;
        }
      }
    } else {
      hasNextPage = false;
    }
  }

  return joinGroups.map((group) => group.group_id);
}
