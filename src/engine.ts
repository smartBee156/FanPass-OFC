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

    // 1. Initialize / Start quest
    const startUrl = `${BASE_API}/quests/${questId}/start`;
    const startRes = await axios.post(startUrl, { questId }, { headers, validateStatus: () => true });
    logs.push({ step: 'START_QUEST', status: startRes.status, response: startRes.data });

    const serverInstance = startRes.data || {};
    const actualUserId = serverInstance.user_id;

    if (!actualUserId) {
      return { success: false, data: { logs }, message: '❌ Could not retrieve user_id from start response.' };
    }

    const encodedUser = encodeURIComponent(actualUserId);

    // 2. Probe user profile, wallets, and deposit/polymarket status endpoints
    const probeEndpoints = [
      `${BASE_API}/users/me`,
      `${BASE_API}/wallets/me`,
      `${BASE_API}/users/${encodedUser}/wallets`,
      `${BASE_API}/polymarket/status`,
      `${BASE_API}/polymarket/verify`,
      `${BASE_API}/quests/${questId}/progress/${encodedUser}/refresh`,
      `${BASE_API}/quests/user/${encodedUser}/progress`,
      `${BASE_API}/wallets/verify`
    ];

    const probeResults = [];
    for (const url of probeEndpoints) {
      for (const method of ['get', 'post']) {
        const pRes = await axios({
          method,
          url,
          headers,
          data: { questId, user_id: actualUserId },
          validateStatus: () => true
        });

        if (pRes.status !== 404) { // Only log meaningful non-404 responses or check everything
          probeResults.push({
            attempt: `${method.toUpperCase()} ${url}`,
            status: pRes.status,
            response: pRes.data
          });
        }
      }
    }

    logs.push({ step: 'ACCOUNT_PROBES', results: probeResults });

    return {
      success: true,
      data: { actualUserId, logs },
      message: '🔍 Account probes executed. Check logs for active deposit/wallet endpoints.'
    };

  } catch (error: any) {
    return { 
      success: false, 
      data: { error: error.message },
      message: '❌ Engine Error: ' + error.message 
    };
  }
}
