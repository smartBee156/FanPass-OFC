import axios from 'axios';

const BASE_API = 'https://fanpass.proofchain.co.za/api';
const TENANT_ID = 'tenant_1g6k1cew859ls7408';

function extractUserId(token: string): string | null {
  try {
    if (!token.startsWith('eyJ')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.sub || payload.user_id || payload.id || payload.uid || null;
  } catch (e) {
    return null;
  }
}

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
    const jwtUserId = extractUserId(token);
    const logs = [];

    // 1. Initialize / Start the quest with query parameter user_id (proven 200 OK format)
    const startUrl = jwtUserId 
      ? `${BASE_API}/quests/${questId}/start?user_id=${encodeURIComponent(jwtUserId)}`
      : `${BASE_API}/quests/${questId}/start`;

    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    const serverInstance = startRes.data || {};
    const actualUserId = jwtUserId || serverInstance.user_id || serverInstance.userId;

    if (!actualUserId) {
      return { success: false, data: { logs }, message: '❌ Failed to determine user_id from token or server.' };
    }

    const encodedUser = encodeURIComponent(actualUserId);
    const userQuestId = serverInstance.id;

    // 2. Fetch live progress
    const progressUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}`;
    const progressRes = await axios.get(progressUrl, { headers, validateStatus: () => true });
    logs.push({ step: 'GET_PROGRESS', status: progressRes.status, response: progressRes.data });

    // 3. Step completion attempts
    const stepResults = [];
    for (let stepIndex = 0; stepIndex < 4; stepIndex++) {
      const stepCompleteUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/step/${stepIndex}/complete`;
      const sComplete = await axios.post(stepCompleteUrl, { user_quest_id: userQuestId }, { headers, validateStatus: () => true });
      stepResults.push({ step: stepIndex, status: sComplete.status, response: sComplete.data });
    }
    logs.push({ step: 'STEPS_EXECUTION', results: stepResults });

    // 4. Claim reward
    const claimUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, { user_quest_id: userQuestId }, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { actualUserId, userQuestId, logs },
      message: success ? '🚀 Polymarket Quest Successfully Completed & Claimed!' : '⚡ Execution completed. Check logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
