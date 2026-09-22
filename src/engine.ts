import axios from 'axios';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
const TENANT_ID = 'tenant_1g6k1cew859ls7408';

export async function pollAccountVerification(input: string): Promise<{ success: boolean; data?: any; message: string }> {
  try {
    const token = input.trim();
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://fanpass.onefootball.com',
      'Referer': 'https://fanpass.onefootball.com/',
      'X-Tenant-ID': TENANT_ID,
      'Content-Type': 'application/json'
    };

    if (token.startsWith('eyJ')) {
      headers['Authorization'] = 'Bearer ' + token;
    } else {
      headers['Cookie'] = token;
    }

    const questId = '81ff3b8a-03bf-488c-828c-f60923e96149';
    const logs = [];

    // 1. Initialize / Start the quest (without pre-filtering user_id in URL if not required)
    const startUrl = `${BASE_API}/quests/${questId}/start`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    const serverInstance = startRes.data || {};
    const actualUserId = serverInstance.user_id;
    const userQuestId = serverInstance.id;

    if (!actualUserId) {
      return { success: false, data: { logs }, message: '❌ Failed to extract server-bound user_id from START response.' };
    }

    const encodedUser = encodeURIComponent(actualUserId);

    // 2. Fetch live progress using the correct server-bound user ID
    const progressUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}`;
    const progressRes = await axios.get(progressUrl, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_PROGRESS', status: progressRes.status, response: progressRes.data });

    // 3. Attempt step verification/completion using the correct instance context
    const stepResults = [];
    for (let stepIndex = 0; stepIndex < 4; stepIndex++) {
      const stepCompleteUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/step/${stepIndex}/complete`;
      const sComplete = await axios.post(stepCompleteUrl, { user_quest_id: userQuestId }, { headers, validateStatus: () => true });
      stepResults.push({ step: stepIndex, status: sComplete.status, response: sComplete.data });
    }
    logs.push({ step: 'STEPS_EXECUTION', results: stepResults });

    // 4. Claim final reward
    const claimUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, { user_quest_id: userQuestId }, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { actualUserId, userQuestId, logs },
      message: success ? '🚀 Polymarket Quest Successfully Completed & Claimed!' : '⚡ Executed with bound server ID. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
