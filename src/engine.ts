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
    const userId = extractUserId(token) || 'afe546fe-0aa9-4a4b-9ff4-81db76b76cdf';
    const encodedUser = encodeURIComponent(userId);

    const logs = [];

    // 1. Initialize / Start the quest (Proven 200 OK route)
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    // 2. Loop through all 4 steps (0, 1, 2, 3) using Bolt's discovered progress paths
    const stepResults = [];
    for (let stepIndex = 0; stepIndex < 4; stepIndex++) {
      const stepStartUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/step/${stepIndex}/start`;
      const stepCompleteUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/step/${stepIndex}/complete`;

      const sStart = await axios.post(stepStartUrl, {}, { headers, validateStatus: () => true });
      const sComplete = await axios.post(stepCompleteUrl, {}, { headers, validateStatus: () => true });

      stepResults.push({
        step: stepIndex,
        startStatus: sStart.status,
        completeStatus: sComplete.status,
        completeResponse: sComplete.data
      });
    }

    logs.push({ step: 'STEPS_EXECUTION', results: stepResults });

    // 3. Claim final reward using Bolt's discovered claim path
    const claimUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { userId, questId, logs },
      message: success ? '🚀 Polymarket Quest Fully Completed & Claimed!' : '⚡ Steps executed on tenant API. Check response logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
